---
description: identify top-level entry functions
---

- For the current Google Apps Script project, identify top-level entry functions (e.g., onOpen, onEdit, doGet, doPost, and custom menu handlers).
- Keep these entry functions thin: they should only handle wiring (reading inputs, invoking core logic, and writing outputs).
- Extract most business logic into reusable pure or side-effect-minimized functions in separate modules/files.
- Avoid introducing new global mutable state; prefer passing dependencies explicitly as parameters.
- Preserve existing function names that may be bound to triggers or menus to avoid breaking Apps Script bindings.
