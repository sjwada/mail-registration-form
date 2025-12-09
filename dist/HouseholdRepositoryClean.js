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
    // This looks complex because the original data model is spread across sheets.
    // In a clean repository, we coordinate the adapter reads.
    
    return this.adapter.readTable('保護者マスタ')
      .flatMap(guardians => {
        const found = guardians.find(g => g['連絡用メールアドレス'] === email);
        if (found) {
          // Found in guardian, get the Household ID
          return Result.ok(found['世帯登録番号']);
        }
        
        // Not found in guardians, check students
        return this.adapter.readTable('生徒マスタ')
          .map(students => {
             const foundStudent = students.find(s => s['連絡用メールアドレス'] === email);
             return foundStudent ? foundStudent['世帯登録番号'] : null;
          });
      })
      .flatMap(householdId => {
        if (!householdId) return Result.ok(null); // Not found anywhere
        
        // If found, fetch full household data
        return this.getHouseholdData(householdId);
      });
  }

  /**
   * Fetch full household aggregate.
   * @param {string} householdId 
   */
  getHouseholdData(householdId) {
    // Parallel-ish fetch (in sequential GAS)
    // We need Household, Guardians, Students
    
    // We strive to use Result combinators here. 
    // Ideally: Result.all([readH, readG, readS])
    // For now, simple nesting or helper.
    
    let householdRecord = null;
    let guardianRecords = [];
    let studentRecords = [];
    
    return this.adapter.readTable('世帯マスタ')
      .flatMap(rows => {
        // Find latest version of household?
        // Legacy 'getHouseholdRecord' logic: find row with matching ID and max version.
        const matches = rows.filter(r => r['世帯登録番号'] === householdId);
        if (matches.length === 0) return Result.ok(null);

        // Sort by version desc (assuming version col is known or we parse it)
        // Original: row[12] is version. Adapter uses headers.
        // Assuming header 'バージョン' exists.
        matches.sort((a, b) => Number(b['バージョン']) - Number(a['バージョン']));
        householdRecord = matches[0];
        
        if (!householdRecord) return Result.ok(null);

        return this.adapter.readTable('保護者マスタ');
      })
      .flatMap(guardians => {
        if (!householdRecord) return Result.ok(null);
        // Filter by householdId
        guardianRecords = guardians.filter(g => g['世帯登録番号'] === householdId);
        
        return this.adapter.readTable('生徒マスタ');
      })
      .map(students => {
        if (!householdRecord) return null;
        studentRecords = students.filter(s => s['世帯登録番号'] === householdId);
        
        // Construct Aggregate
        return {
          household: householdRecord,
          guardians: guardianRecords,
          students: studentRecords
        };
      });
  }

  /**
   * Save plain household object.
   * (Logic for generating IDs etc should be in Service, Repository just saves)
   * But preserving legacy 'id generation' inside repository for now if needed?
   * No, New Service should handle ID generation. Repository just takes data.
   */
  /**
   * Save plain household object (Create or Update).
   * @param {object} householdData 
   * @returns {Result<object, Error>} { householdId, editCode, ... }
   */
  save(householdData) {
    // 1. Generate IDs if new
    // We need to know if it's new or update.
    // If householdId is missing, it's new.
    
    // For now, let's implement Creation flow logic.
    // If update, we might need a separate method or flag.
    // Legacy 'saveHouseholdData' was for NEW registration. 'updateHouseholdData' was for update.
    // Let's stick to CREATE for now as per correct CRUD separation or handle both.
    // Given the legacy code separation, let's make this 'create'.
    
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
         
         const householdRow = {
           '世帯登録番号': householdId,
           'Core世帯ID': '', // Assuming 'Core世帯ID' is the header for coreHouseholdId based on typical implementation, or empty string if not used by column mapping? 
           // Wait, I should better not guess headers that I am unsure of.
           // However, appendObject simply skips keys if header not found (or rather map logic in adapter handles it). 
           // Adapter loops headers and looks up obj. So extra keys in obj are ignored. Missing keys in obj result in empty string.
           // So I should define keys that I KNOW exist.
           '登録日時': nowStr,
           '更新日時': nowStr,
           '編集コード': editCode,
           '郵便番号': data.household.postalCode,
           '都道府県': data.household.prefecture,
           '市区町村': data.household.city,
           '町名・番地': data.household.street,
           '建物名等': data.household.building,
           '備考': data.household.notes,
           '連携ステータス': '',
           'バージョン': 1,
           '削除フラグ': false,
           '更新者': data.guardians[0].email 
         };

         // Save Household
         return this.adapter.appendObject('世帯マスタ', householdRow)
           .map(() => ({ householdId, editCode, nowStr }));
       })
       .flatMap(ctx => {
         // Save Guardians
         const saveGuardians = data.guardians.map((g, index) => {
           const row = {
             '世帯登録番号': ctx.householdId,
             '連絡優先順位': g.contactPriority,
             '氏名（氏）': g.lastName,
             '氏名（名）': g.firstName,
             '氏名（カナ・氏）': g.lastNameKana,
             '氏名（カナ・名）': g.firstNameKana,
             '続柄': g.relationship,
             '郵便番号': g.postalCode,
             '都道府県': g.prefecture,
             '市区町村': g.city,
             '町名・番地': g.street,
             '建物名等': g.building,
             '携帯電話番号': g.mobilePhone,
             '自宅電話番号': g.homePhone,
             '連絡用メールアドレス': g.email,
             'バージョン': 1,
             '削除フラグ': false,
             '更新日時': ctx.nowStr,
             '更新者': g.email
           };
           return this.adapter.appendObject('保護者マスタ', row);
         });
         
         // In a robust implementation, we would wait for all.
         // Since GAS is synchronous, this map actually executes them one by one.
         // But we need to check if any failed? 
         // appendObject returns Result.
         // We should verify they are all Ok.
         const failures = saveGuardians.filter(r => r.isErr());
         if (failures.length > 0) {
            return Result.err(new Error("Failed to save some guardians: " + failures[0]._error));
         }

         return Result.ok(ctx);
       })
       .flatMap(ctx => {
          // Save Students
          const saveStudents = data.students.map(s => {
            const row = {
              '世帯登録番号': ctx.householdId,
              '氏名（氏）': s.lastName,
              '氏名（名）': s.firstName,
              '氏名（カナ・氏）': s.lastNameKana,
              '氏名（カナ・名）': s.firstNameKana,
              '卒業予定年度': s.graduationYear,
              '郵便番号': s.postalCode,
              '都道府県': s.prefecture,
              '市区町村': s.city,
              '町名・番地': s.street,
              '建物名等': s.building,
              '携帯電話番号': s.mobilePhone,
              '連絡用メールアドレス': s.email,
              'クラス配信メール': s.classEmail,
               'バージョン': 1,
               '削除フラグ': false,
               '更新日時': ctx.nowStr,
               '更新者': data.guardians[0].email
            };
            return this.adapter.appendObject('生徒マスタ', row);
          });
          
          const failures = saveStudents.filter(r => r.isErr());
          if (failures.length > 0) {
             return Result.err(new Error("Failed to save some students"));
          }

          return Result.ok({ householdId: ctx.householdId, editCode: ctx.editCode });
       });
  }

  // Helpers
  _generateHouseholdId() {
    return this.adapter.readTable('世帯マスタ')
      .map(rows => {
        let maxId = 0;
        rows.forEach(r => {
          const id = r['世帯登録番号'];
          if (id && id.startsWith('HH')) {
            const num = parseInt(id.substring(2), 10);
            if (!isNaN(num) && num > maxId) maxId = num;
          }
        });
        return 'HH' + ('00000' + (maxId + 1)).slice(-5);
      });
  }

  _generateEditCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

if (typeof exports !== 'undefined') {
  exports.HouseholdRepositoryClean = HouseholdRepositoryClean;
}
