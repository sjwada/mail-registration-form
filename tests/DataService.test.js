const path = require('path');
const { loadGasCode } = require('./gas-test-helper');

describe('DataService.js Versioning Tests', () => {
  let context;

  beforeEach(() => {
    // Load Utils.js first as DataService might depend on it (e.g., for date formatting)
    const utilsPath = path.join(__dirname, '../src/Utils.js');
    const dataServicePath = path.join(__dirname, '../src/DataService.js');
    
    // Load both files into the same context
    context = loadGasCode(utilsPath);
    const fs = require('fs');
    const vm = require('vm');
    const dataServiceCode = fs.readFileSync(dataServicePath, 'utf8');
    vm.runInContext(dataServiceCode, context);
  });

  describe('filterLatestRecords', () => {
    test('should return only the latest version for each ID', () => {
      const records = [
        { id: '1', version: 1, deleted: false, name: 'v1' },
        { id: '1', version: 2, deleted: false, name: 'v2' },
        { id: '2', version: 1, deleted: false, name: 'other' }
      ];

      const result = context.filterLatestRecords(records, 'id');
      
      expect(result).toHaveLength(2);
      const v2 = result.find(r => r.id === '1');
      expect(v2.version).toBe(2);
      expect(v2.name).toBe('v2');
    });

    test('should exclude deleted records even if they are the latest', () => {
      const records = [
        { id: '1', version: 1, deleted: false, name: 'v1' },
        { id: '1', version: 2, deleted: true, name: 'v2-deleted' }
      ];

      const result = context.filterLatestRecords(records, 'id');
      
      expect(result).toHaveLength(0);
    });

    test('should handle mixed deleted and active records', () => {
      const records = [
        { id: '1', version: 1, deleted: false }, // Active
        { id: '2', version: 1, deleted: false },
        { id: '2', version: 2, deleted: true },  // Deleted
        { id: '3', version: 3, deleted: false }  // Active
      ];

      const result = context.filterLatestRecords(records, 'id');
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id).sort()).toEqual(['1', '3']);
    });
  });
});
