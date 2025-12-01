const path = require('path');
const { loadGasCode } = require('./gas-test-helper');

describe('Utils.js Tests', () => {
  let context;

  beforeEach(() => {
    const utilsPath = path.join(__dirname, '../src/Utils.js');
    context = loadGasCode(utilsPath);
  });

  test('generateId creates an ID with correct prefix', () => {
    const result = context.generateId('HH', 1);
    expect(result).toBe('HH00001');
  });

  test('isValidEmail validates email correctly', () => {
    expect(context.isValidEmail('test@example.com')).toBe(true);
    expect(context.isValidEmail('invalid-email')).toBe(false);
  });
});
