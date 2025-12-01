const fs = require('fs');
const vm = require('vm');

function loadGasCode(filePath, context = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { 
    ...context, 
    Logger: { log: jest.fn() }, 
    console: console,
    Utilities: {
      getUuid: jest.fn(() => 'mock-uuid'),
      formatDate: jest.fn((date) => date.toISOString())
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

module.exports = { loadGasCode };
