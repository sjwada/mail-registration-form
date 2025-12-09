/**
 * DataSourceAdapter (Infrastructure Layer)
 * 
 * The ONLY place in the application that touches SpreadsheetApp.
 * Acts as a gateway to the raw data storage.
 * returns Result<T, Error> for all operations.
 */

// If utilizing module loading. In raw GAS, Result is global if loaded.
// const { Result } = require('../shared/Result'); 

const DataSourceAdapter = {
  /**
   * Get all data from a sheet as objects.
   * Assumes row 1 is headers.
   * @param {string} sheetName 
   * @returns {Result<Array<Object>>}
   */
  readTable: (sheetName) => {
    return Result.fromTry(() => {
      // Direct GAS dependency here (Isolated)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`Sheet not found: ${sheetName}`);
      }
      
      const values = sheet.getDataRange().getValues();
      if (values.length < 2) return []; // Only headers or empty

      const headers = values[0];
      const dataRows = values.slice(1);

      return dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          // English headers are preferred for keys usually, but using what's there
          obj[header] = row[index]; 
        });
        // Also attach the raw row index (1-based) for potential updates
        // rowIndex = index in dataRows + 2 (1 for header, 1 for 0-index)
        // obj._rowIndex = ... (If needed later for updates)
        return obj;
      });
    });
  },

  /**
   * Append a row to a sheet.
   * @param {string} sheetName 
   * @param {Array<any>} rowData 
   * @returns {Result<void>}
   */
  appendRow: (sheetName, rowData) => {
    return Result.fromTry(() => {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
      
      sheet.appendRow(rowData);
      return true;
    });
  },
  
  /**
   * Append an object to a sheet, mapping keys to headers automatically.
   * @param {string} sheetName
   * @param {Object} dataObj
   * @returns {Result<void>}
   */
  appendObject: (sheetName, dataObj) => {
    return Result.fromTry(() => {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
      
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) throw new Error("Sheet has no headers");
      
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      // Map object to array based on headers
      const row = headers.map(header => {
        // Check if property exists, else empty string
        return dataObj.hasOwnProperty(header) ? dataObj[header] : '';
      });
      
      sheet.appendRow(row);
      // Optional: Set specific formats if needed (like zip codes) here or via separate call
      // For now, we rely on sheet formatting or pre-formatted strings.
      
      return true;
    });
  },

  /**
   * Update a specific row (by 1-based index).
   * @param {string} sheetName
   * @param {number} rowIndex 1-based row index
   * @param {Array<any>} rowData
   */
  updateRow: (sheetName, rowIndex, rowData) => {
    return Result.fromTry(() => {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = ss.getSheetByName(sheetName);
       if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
       
       sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
       return true;
    });
  },

  /**
   * Helper to set column format (e.g. text for ZIP codes).
   */
  setColumnFormat: (sheetName, rowIndex, colIndex, format) => {
    return Result.fromTry(() => {
       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = ss.getSheetByName(sheetName);
       if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
       
       sheet.getRange(rowIndex, colIndex).setNumberFormat(format);
       return true;
    });
  }
};

// Export (supports both CommonJS and GAS global scope via assignment if needed)
if (typeof exports !== 'undefined') {
  exports.DataSourceAdapter = DataSourceAdapter;
}
