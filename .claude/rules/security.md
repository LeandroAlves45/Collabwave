---
paths:
  - "backend/src/**"
---

# Security

- Validate all user input at the system boundary. Never trust request parameters.
- Use parameterized queries. Never concatenate user input into SQL or shell commands.
- Sanitize output to prevent XSS. Use framework-provided escaping.
- Never log secrets, tokens, passwords, or PII.
- Use constant-time comparison for secrets and tokens.
- Set appropriate CORS, CSP, and security headers.
