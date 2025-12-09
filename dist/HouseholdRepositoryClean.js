/**
 * HouseholdRepositoryClean (Infrastructure Layer)
 * 
 * Concrete implementation of the Repository using DataSourceAdapter.
 * Pure JS, no usage of 'SpreadsheetApp'.
 */

// const { HouseholdRepositoryInterface } = require('./HouseholdRepositoryInterface');
// const { DataSourceAdapter } = require('../../infra/DataSourceAdapter');
// const { Result } = require('../../shared/Result');

class HouseholdRepositoryClean { // extends HouseholdRepositoryInterface
  
  constructor(adapter) {
    this.adapter = adapter || DataSourceAdapter;
  }

  /**
   * Find a household by email.
   * Scans both Guardian and Student tables (as per legacy logic), but cleanly.
   * @param {string} email
   * @returns {Result<Object|null, Error>}
   */
  findByEmail(email) {
    // 1. Check Guardians
    // 2. Check Students
    
    return this.adapter.readTable(CONFIG.SHEET_GUARDIAN)
      .flatMap(guardians => {
        // Correct header: '連絡用メール' from InitializeSheet.js
        const found = guardians.find(g => g['連絡用メール'] === email);
        if (found) {
          return Result.ok(found['世帯登録番号']);
        }
        
        // Not found in guardians, check students
        return this.adapter.readTable(CONFIG.SHEET_STUDENT)
          .map(students => {
             // Correct header: '連絡用メール' from InitializeSheet.js
             const foundStudent = students.find(s => s['連絡用メール'] === email);
             return foundStudent ? foundStudent['世帯登録番号'] : null;
          });
      })
      .flatMap(householdId => {
        if (!householdId) return Result.ok(null);
        return this.getHouseholdData(householdId);
      });
  }

  /**
   * Fetch full household aggregate.
   * @param {string} householdId 
   */
  getHouseholdData(householdId) {
    let householdRecord = null;
    let guardianRecords = [];
    let studentRecords = [];
    
    // Use CONFIG constants
    return this.adapter.readTable(CONFIG.SHEET_HOUSEHOLD)
      .flatMap(rows => {
        // Robust ID comparison
        const matches = rows.filter(r => String(r['世帯登録番号'] || '').trim() === String(householdId || '').trim());
        
        if (matches.length === 0) {
           // DEBUG: check if it exists loosely? 
           // For now, honestly return null.
           return Result.ok(null);
        }

        // Sort by version desc (header 'バージョン')
        // Handle NaN/Undefined safely
        matches.sort((a, b) => {
           let vA = Number(a['バージョン']);
           let vB = Number(b['バージョン']);
           if (isNaN(vA)) vA = 0;
           if (isNaN(vB)) vB = 0;
           return vB - vA;
        });
        
        householdRecord = matches[0];
        
        if (!householdRecord) return Result.ok(null);

        return this.adapter.readTable(CONFIG.SHEET_GUARDIAN);
      })
      .flatMap(guardians => {
        if (!householdRecord) return Result.ok(null);
        guardianRecords = guardians.filter(g => g['世帯登録番号'] === householdId);
        
        return this.adapter.readTable(CONFIG.SHEET_STUDENT);
      })
      .map(students => {
        if (!householdRecord) return null;
        // Filter by householdId
        studentRecords = students.filter(s => s['世帯登録番号'] === householdId);
        
        return {
          household: householdRecord,
          guardians: guardianRecords,
          students: studentRecords
        };
      });
  }

  /**
   * Save plain household object (Create or Update).
   * @param {object} householdData 
   * @returns {Result<object, Error>} { householdId, editCode, ... }
   */
  save(householdData) {
    // 1. Generate IDs if new
    const isNew = !householdData.household || !householdData.household.householdId;
    
    if (isNew) {
      return this._create(householdData);
    } else {
      return this._update(householdData);
    }
  }

  _update(data) {
     const householdId = data.household.householdId;
     /*
      * Versioning Strategy:
      * 1. Get current data to find max version.
      * 2. Increment version.
      * 3. Append new rows with new version.
      * (Do not overwrite old rows)
      */
     return this.getHouseholdData(householdId)
       .flatMap(current => {
          if (!current || !current.household) {
             return Result.err(new Error(`更新対象の世帯データが見つかりません (ID: ${householdId})`));
          }
          
          const currentVersion = Number(current.household['バージョン'] || 0);
          const newVersion = currentVersion + 1;
          const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
          const userEmail = data.guardians[0].email; // Assuming 1st guardian is updater, or passed in context
          
          // 1. Save Household (New Version)
          const householdRow = {
            '世帯登録番号': householdId,
            '基幹世帯ID': current.household['基幹世帯ID'], // Inherit
            '登録日時': current.household['登録日時'], // Inherit
            '最終更新日時': nowStr,
            '編集コード': current.household['編集コード'], // Inherit
            'ご自宅郵便番号': data.household.postalCode,
            'ご自宅都道府県': data.household.prefecture,
            'ご自宅市区町村': data.household.city,
            'ご自宅町名・番地・号': data.household.street,
            'ご自宅建物名・部屋番号': data.household.building,
            '備考': data.household.notes,
            '連携ステータス': current.household['連携ステータス'],
            'バージョン': newVersion,
            '削除フラグ': false,
            '更新日時': nowStr,
            '更新者メール': userEmail
          };
          
          const householdFormats = { 'ご自宅郵便番号': '@' };

          return this.adapter.appendObject(CONFIG.SHEET_HOUSEHOLD, householdRow, householdFormats)
             .map(() => ({ householdId, newVersion, nowStr, userEmail, current }));
       })
       .flatMap(ctx => {
          // 2. Save Guardians
          // Strategy: Treat all submitted guardians as "Current Active State".
          // New rows for all of them.
          // Reuse IDs if they exist in current data, Generate New IDs if not.
          
          // Map of Old Generic ID -> Real ID?
          // Frontend sends `guardianId` if existing.
          
          const saveGuardians = data.guardians.map((g, index) => {
             // Determine ID: passed from front or generate new?
             // If g.guardianId is present, use it. If not, generate.
             // But treating async generation inside map is hard.
             // PRE-GENERATION needed for new ones?
             // Since we need to know HOW MANY new ones to generate IDs for.
             return g;
          });
          
          const newGuardiansCount = saveGuardians.filter(g => !g.guardianId).length;
          
          return (newGuardiansCount > 0 
             ? this._generateSubIds(CONFIG.SHEET_GUARDIAN, '保護者登録番号', 'G', newGuardiansCount)
             : Result.ok([]))
             .flatMap(newIds => {
                 let newIdIndex = 0;
                 
                 const appendResults = saveGuardians.map(g => {
                     let gId = g.guardianId;
                     if (!gId) {
                         gId = newIds[newIdIndex++];
                     }
                     
                     // Inherit legacy ID if exists (find in ctx.current.guardians)
                     const oldRecord = ctx.current.guardians.find(cg => cg['保護者登録番号'] === gId);
                     const kikanId = oldRecord ? oldRecord['基幹保護者ID'] : '';

                     const row = {
                      '世帯登録番号': ctx.householdId,
                      '保護者登録番号': gId,
                      '基幹保護者ID': kikanId,
                      '続柄': g.relationship,
                      '続柄その他詳細': '', 
                      '連絡優先順位': g.contactPriority,
                      '連絡手段': g.contactMethod || '電話', 
                      '姓': g.lastName,
                      '名': g.firstName,
                      'フリガナ姓': g.lastNameKana,
                      'フリガナ名': g.firstNameKana,
                      '連絡用メール': g.email,
                      'オンライン面談用メール': g.meetingEmail || '',
                      '携帯電話番号': g.mobilePhone,
                      '自宅電話番号': g.homePhone,
                      '保護者郵便番号': g.postalCode,
                      '保護者都道府県': g.prefecture,
                      '保護者市区町村': g.city,
                      '保護者町名・番地・号': g.street,
                      '保護者建物名・部屋番号': g.building,
                      'バージョン': ctx.newVersion,
                      '削除フラグ': g.isDeleted || false, // If logical delete requested by front
                      '更新日時': ctx.nowStr,
                      '更新者メール': ctx.userEmail
                     };
                     
                     const formats = { '携帯電話番号': '@', '自宅電話番号': '@', '保護者郵便番号': '@' };
                     return this.adapter.appendObject(CONFIG.SHEET_GUARDIAN, row, formats);
                 });
                 
                 const failures = appendResults.filter(r => r.isErr());
                 if (failures.length > 0) return Result.err(new Error("Failed to save guardians: " + failures[0]._error));
                 return Result.ok(ctx);
             });
       })
       .flatMap(ctx => {
           // 3. Save Students
           // Same strategy as Guardians
           const saveStudents = data.students;
           const newStudentCount = saveStudents.filter(s => !s.studentId).length;
           
           return (newStudentCount > 0
              ? this._generateSubIds(CONFIG.SHEET_STUDENT, '生徒登録番号', 'S', newStudentCount)
              : Result.ok([]))
              .flatMap(newIds => {
                  let newIdIndex = 0;
                  const appendResults = saveStudents.map(s => {
                      let sId = s.studentId;
                      if (!sId) sId = newIds[newIdIndex++];
                      
                      const oldRecord = ctx.current.students.find(cs => cs['生徒登録番号'] === sId);
                      const kikanId = oldRecord ? oldRecord['基幹生徒ID'] : '';

                      const row = {
                       '世帯登録番号': ctx.householdId,
                       '生徒登録番号': sId,
                       '基幹生徒ID': kikanId,
                       '姓': s.lastName,
                       '名': s.firstName,
                       'フリガナ姓': s.lastNameKana,
                       'フリガナ名': s.firstNameKana,
                       '高校卒業予定年': s.graduationYear,
                       '連絡用メール': s.email,
                       'オンライン授業用メール': s.classEmail || '',
                       '携帯電話番号': s.mobilePhone,
                       '住所フラグ': '',
                       '生徒郵便番号': s.postalCode,
                       '生徒都道府県': s.prefecture,
                       '生徒市区町村': s.city,
                       '生徒町名・番地・号': s.street,
                       '生徒建物名・部屋番号': s.building,
                       'バージョン': ctx.newVersion,
                       '削除フラグ': s.isDeleted || false,
                       '更新日時': ctx.nowStr,
                       '更新者メール': ctx.userEmail
                      };

                      const formats = { '携帯電話番号': '@', '生徒郵便番号': '@' };
                      return this.adapter.appendObject(CONFIG.SHEET_STUDENT, row, formats);
                  });

                  const failures = appendResults.filter(r => r.isErr());
                  if (failures.length > 0) return Result.err(new Error("Failed to save students: " + failures[0]._error));
                  
                  return Result.ok({ 
                      householdId: ctx.householdId, 
                      version: ctx.newVersion 
                  });
              });
       });

     return this._generateHouseholdId()
       .flatMap(householdId => {
         const editCode = this._generateEditCode();
         const now = new Date(); 
         const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
         const userEmail = data.guardians[0].email;
         
         const householdRow = {
           '世帯登録番号': householdId,
           '基幹世帯ID': '', // Correct Header
           '登録日時': nowStr,
           '最終更新日時': nowStr, 
           '編集コード': editCode,
           'ご自宅郵便番号': data.household.postalCode, // Correct Header
           'ご自宅都道府県': data.household.prefecture,
           'ご自宅市区町村': data.household.city,
           'ご自宅町名・番地・号': data.household.street,
           'ご自宅建物名・部屋番号': data.household.building,
           '備考': data.household.notes,
           '連携ステータス': '',
           'バージョン': 1,
           '削除フラグ': false,
           '更新日時': nowStr,
           '更新者メール': userEmail // Correct Header
         };

         // Save Household
         const householdFormats = {
           'ご自宅郵便番号': '@'
         };
         return this.adapter.appendObject(CONFIG.SHEET_HOUSEHOLD, householdRow, householdFormats)
           .map(() => ({ householdId, editCode, nowStr, userEmail }));
       })
       .flatMap(ctx => {
         // Generate & Save Guardians
         return this._generateSubIds(CONFIG.SHEET_GUARDIAN, '保護者登録番号', 'G', data.guardians.length)
             .flatMap(guardianIds => {
                 const saveGuardians = data.guardians.map((g, index) => {
                   const row = {
                     '世帯登録番号': ctx.householdId,
                     '保護者登録番号': guardianIds[index],
                     '基幹保護者ID': '',
                     '続柄': g.relationship,
                     '続柄その他詳細': '', 
                     '連絡優先順位': g.contactPriority,
                     '連絡手段': g.contactMethod || '電話', 
                     '姓': g.lastName,
                     '名': g.firstName,
                     'フリガナ姓': g.lastNameKana,
                     'フリガナ名': g.firstNameKana,
                     '連絡用メール': g.email,
                     'オンライン面談用メール': g.meetingEmail || '',
                     '携帯電話番号': g.mobilePhone,
                     '自宅電話番号': g.homePhone,
                     '保護者郵便番号': g.postalCode,
                     '保護者都道府県': g.prefecture,
                     '保護者市区町村': g.city,
                     '保護者町名・番地・号': g.street,
                     '保護者建物名・部屋番号': g.building,
                     'バージョン': 1,
                     '削除フラグ': false,
                     '更新日時': ctx.nowStr,
                     '更新者メール': ctx.userEmail
                   };
                   
                   const guardianFormats = {
                     '携帯電話番号': '@',
                     '自宅電話番号': '@',
                     '保護者郵便番号': '@'
                   };
                   return this.adapter.appendObject(CONFIG.SHEET_GUARDIAN, row, guardianFormats);
                 });
                 
                 const failures = saveGuardians.filter(r => r.isErr());
                 if (failures.length > 0) return Result.err(new Error("Failed to save some guardians: " + failures[0]._error));
                 return Result.ok(ctx);
             });
       })
       .flatMap(ctx => {
          // Generate & Save Students
          return this._generateSubIds(CONFIG.SHEET_STUDENT, '生徒登録番号', 'S', data.students.length)
             .flatMap(studentIds => {
                 const saveStudents = data.students.map((s, index) => {
                    const row = {
                      '世帯登録番号': ctx.householdId,
                      '生徒登録番号': studentIds[index],
                      '基幹生徒ID': '',
                      '姓': s.lastName,
                      '名': s.firstName,
                      'フリガナ姓': s.lastNameKana,
                      'フリガナ名': s.firstNameKana,
                      '高校卒業予定年': s.graduationYear,
                      '連絡用メール': s.email,
                      'オンライン授業用メール': s.classEmail || '',
                      '携帯電話番号': s.mobilePhone,
                      '住所フラグ': '', // Default?
                      '生徒郵便番号': s.postalCode,
                      '生徒都道府県': s.prefecture,
                      '生徒市区町村': s.city,
                      '生徒町名・番地・号': s.street,
                      '生徒建物名・部屋番号': s.building,
                      'バージョン': 1,
                      '削除フラグ': false,
                      '更新日時': ctx.nowStr,
                      '更新者メール': ctx.userEmail
                    };
                    
                    const studentFormats = {
                       '携帯電話番号': '@',
                       '生徒郵便番号': '@'
                    };
                    return this.adapter.appendObject(CONFIG.SHEET_STUDENT, row, studentFormats);
                 });
                 
                 const failures = saveStudents.filter(r => r.isErr());
                 if (failures.length > 0) return Result.err(new Error("Failed to save some students"));
                 return Result.ok({ householdId: ctx.householdId, editCode: ctx.editCode });
             });
       });
  }

  // Helpers
  _generateHouseholdId() {
    return this._generateId(CONFIG.SHEET_HOUSEHOLD, '世帯登録番号', 'HH');
  }

  _generateSubIds(sheetName, idColumn, prefix, count) {
      // Need 'count' consecutive IDs.
      // Scan once, find max, then generate array.
      return this.adapter.readTable(sheetName)
        .map(rows => {
           let maxId = 0;
           rows.forEach(r => {
             const idStr = r[idColumn];
             if (idStr && idStr.startsWith(prefix)) {
                 const num = parseInt(idStr.substring(prefix.length), 10);
                 if (!isNaN(num) && num > maxId) maxId = num;
             }
           });
           
           const ids = [];
           for (let i = 1; i <= count; i++) {
               ids.push(prefix + String(maxId + i).padStart(5, '0'));
           }
           return ids;
        });
  }

  _generateId(sheetName, idColumn, prefix) {
      return this._generateSubIds(sheetName, idColumn, prefix, 1).map(ids => ids[0]);
  }

  _generateEditCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

if (typeof exports !== 'undefined') {
  exports.HouseholdRepositoryClean = HouseholdRepositoryClean;
}
