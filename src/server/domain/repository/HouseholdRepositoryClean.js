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
        const matches = rows.filter(r => r['世帯登録番号'] === householdId);
        if (matches.length === 0) return Result.ok(null);

        // Sort by version desc (header 'バージョン')
        matches.sort((a, b) => Number(b['バージョン']) - Number(a['バージョン']));
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
      // return this._update(householdData);
      return Result.err(new Error("Update not yet implemented in clean repository"));
    }
  }

  _create(data) {
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
