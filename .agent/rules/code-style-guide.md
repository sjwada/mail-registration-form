---
trigger: always_on
---

- The target runtime is Google Apps Script (V8). All JavaScript must be valid in the Google Apps Script environment and use its built-in services (e.g., SpreadsheetApp, DriveApp, etc.) where appropriate.
- Write JavaScript in a primarily functional and declarative style, preferring pure functions, immutability, and small composable functions over classes and shared mutable state.
- Design the code to be loosely coupled and highly cohesive: each function or module should have a single clear responsibility and depend on explicit inputs rather than hidden global state.
- Keep top-level entry functions (e.g., Apps Script triggers like onEdit, onOpen, or custom menu handlers) thin. Delegate most behavior to reusable pure functions in separate modules.
- Use pipeline-style or reactive-like patterns (e.g., map/filter/reduce, data transformation pipelines, trigger-driven flows) for data processing and event handling where appropriate, instead of deeply nested imperative loops.
- Use JSDoc comments (/\*_ ... _/) for exported or top-level entry functions and non-trivial internal functions, documenting the purpose, parameters, return values, and important side effects using tags such as @param and @returns.
- Ensure all JavaScript passes ESLint with the project’s configuration (including any settings for the Google Apps Script environment).
