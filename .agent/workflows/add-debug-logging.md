---
description: Add debug logging
---

- Add lightweight debug logging around key branches, error paths, and external API calls to help diagnose issues.
- For Google Apps Script, use Logger.log; for other environments, use console.log or the project's preferred logging mechanism.
- Avoid logging sensitive data such as access tokens, passwords, or personally identifiable information.
- Keep performance impact minimal and do not change the functional behavior of the code aside from logging.
