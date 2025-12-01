const path = require('path');
const { loadGasCode } = require('./gas-test-helper');

describe('DataService.js Bug Reproduction', () => {
  let context;

  beforeEach(() => {
    const utilsPath = path.join(__dirname, '../src/Utils.js');
    const configPath = path.join(__dirname, '../src/Config.js');
    const dataServicePath = path.join(__dirname, '../src/DataService.js');
    
    context = loadGasCode(utilsPath);
    const fs = require('fs');
    const vm = require('vm');
    
    // Mock Config
    context.CONFIG = {
      SHEET_HOUSEHOLD: 'Household',
      SHEET_GUARDIAN: 'Guardian',
      SHEET_STUDENT: 'Student'
    };

    // Mock SpreadsheetApp
    const mockSheet = {
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({ getValues: jest.fn(() => []) })),
      getLastRow: jest.fn(() => 0)
    };
    context.SpreadsheetApp = {
      openById: jest.fn(() => ({
        getSheetByName: jest.fn(() => mockSheet)
      })),
      getActiveSpreadsheet: jest.fn(() => ({
        getSheetByName: jest.fn(() => mockSheet)
      }))
    };
    
    // Load Config (defines getHouseholdSheet etc which we need to mock or load)
    // Actually Config.js defines getHouseholdSheet using SpreadsheetApp, so loading it is fine if we mocked SpreadsheetApp
    const configCode = fs.readFileSync(configPath, 'utf8');
    vm.runInContext(configCode, context);

    const dataServiceCode = fs.readFileSync(dataServicePath, 'utf8');
    vm.runInContext(dataServiceCode, context);
  });

  test('saveHouseholdData should fail with current implementation', () => {
    const formData = {
      household: {
        postalCode: '123-4567',
        prefecture: 'Tokyo',
        city: 'City',
        street: 'Street',
        building: 'Building',
        notes: 'Notes'
      },
      guardians: [
        { email: 'guardian@example.com', firstName: 'G', lastName: 'L' }
      ],
      students: [
        { firstName: 'S', lastName: 'L' }
      ]
    };

    expect(() => {
      context.saveHouseholdData(formData);
    }).not.toThrow();
  });
});
