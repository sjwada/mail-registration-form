---
description: Generate unit tests for the current project
---

- Generate unit tests for the current project.
- Prefer tests for each exported or top-level function.
- Use the existing test framework if present. If none exists, suggest or scaffold a minimal test setup appropriate for the environment (e.g., Jest for Node/TypeScript, a simple test runner or Apps Script–compatible tests for Google Apps Script).
- Preserve existing public APIs and behavior; do not change production code except when strictly necessary for testability.
