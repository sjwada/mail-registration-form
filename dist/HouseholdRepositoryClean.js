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
   * Find household by login email address.
   * @param {string} email - Login email address
   * @returns {Result<Object|null, Error>}
   */
  findByEmail(email) {
    return this.adapter.readTable(CONFIG.SHEET_HOUSEHOLD)
      .flatMap(households => {
        // Find household with matching login email
        const matches = households.filter(h => h['ログイン用メールアドレス'] === email);
        
        if (matches.length === 0) {
          return Result.ok(null); // Not found
        }
        
        if (matches.length > 1) {
          // Should not happen if uniqueness is enforced, but check anyway
          throw new Error('このメールアドレスは既に登録されています');
        }
        
        const householdId = matches[0]['世帯登録番号'];
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

        const currentVersion = householdRecord['バージョン'];

        return this.adapter.readTable(CONFIG.SHEET_GUARDIAN)
      })
      .flatMap(guardians => {
        if (!householdRecord) return Result.ok(null); // Should be unreachable given check above but safe
        
        // Filter by Household ID AND Version equality
        // (Assuming version lock-step strategy enforced by _update)
        const currentVersion = householdRecord['バージョン'];
        guardianRecords = guardians.filter(g => 
            String(g['世帯登録番号']) === String(householdId) &&
            String(g['バージョン']) === String(currentVersion)
        );
        
        return this.adapter.readTable(CONFIG.SHEET_STUDENT);
      })
      .map(students => {
        if (!householdRecord) return null;
        
        const currentVersion = householdRecord['バージョン'];
        studentRecords = students.filter(s => 
            String(s['世帯登録番号']) === String(householdId) &&
            String(s['バージョン']) === String(currentVersion)
        );
        
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
           const userEmail = data.guardians[0].email;
           
           // Check login email uniqueness if it's being changed
           const loginEmail = data.household.loginEmail;
           const currentLoginEmail = current.household['ログイン用メールアドレス'];
           
           if (loginEmail !== currentLoginEmail) {
             // Email is being changed, check uniqueness
             return this.adapter.readTable(CONFIG.SHEET_HOUSEHOLD)
               .flatMap(households => {
                 const existing = households.find(h => 
                   h['ログイン用メールアドレス'] === loginEmail &&
                   h['世帯登録番号'] !== householdId
                 );
                 if (existing) {
                   return Result.err(new Error('このメールアドレスは既に登録されています'));
                 }
                 return Result.ok({ householdId, newVersion, nowStr, userEmail, current, loginEmail });
               });
           }
           
           return Result.ok({ householdId, newVersion, nowStr, userEmail, current, loginEmail: currentLoginEmail });
          
        })
        .flatMap(ctx => {
           // 1. Save Household (New Version)
           const householdRow = {
             '世帯登録番号': ctx.householdId,
             '基幹世帯ID': ctx.current.household['基幹世帯ID'],
             '登録日時': ctx.current.household['登録日時'],
             '最終更新日時': ctx.nowStr,
             '編集コード': ctx.current.household['編集コード'],
             'ログイン用メールアドレス': ctx.loginEmail,
             '備考': data.household.notes || '',
             '連携ステータス': ctx.current.household['連携ステータス'],
             'バージョン': ctx.newVersion,
             '削除フラグ': false,
             '更新日時': ctx.nowStr,
             '更新者メール': ctx.userEmail
           };
           
           const householdFormats = {};

          return this.adapter.appendObject(CONFIG.SHEET_HOUSEHOLD, householdRow, householdFormats)
             .map(() => ({ householdId: ctx.householdId, newVersion: ctx.newVersion, nowStr: ctx.nowStr, userEmail: ctx.userEmail, current: ctx.current }));
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
  }

  /**
   * Create a new household.
   * @param {object} data
   */
  _create(data) {
     // 1. Check login email uniqueness
     const loginEmail = data.household.loginEmail;
     if (!loginEmail) {
       return Result.err(new Error('ログイン用メールアドレスは必須です'));
     }
     
     return this.adapter.readTable(CONFIG.SHEET_HOUSEHOLD)
       .flatMap(households => {
         // Check if login email already exists
         const existing = households.find(h => h['ログイン用メールアドレス'] === loginEmail);
         if (existing) {
           return Result.err(new Error('このメールアドレスは既に登録されています'));
         }
         
         return this._generateHouseholdId();
       })
       .flatMap(householdId => {
         const editCode = this._generateEditCode();
         const now = new Date(); 
         const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
         const userEmail = data.guardians[0].email;
         
          const householdRow = {
            '世帯登録番号': householdId,
            '基幹世帯ID': '',
            '登録日時': nowStr,
            '最終更新日時': nowStr, 
            '編集コード': editCode,
            'ログイン用メールアドレス': loginEmail,
            '備考': data.household.notes || '',
            '連携ステータス': '',
            'バージョン': 1,
            '削除フラグ': false,
            '更新日時': nowStr,
            '更新者メール': userEmail
          };

          // Save Household
          const householdFormats = {};
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
