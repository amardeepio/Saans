# Security policy

Saans is a privacy-first, no-account application. It stores no household data on a server and has no database.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Email the maintainer at the address on the GitHub profile, or use GitHub's private vulnerability reporting if available. Include:

- A short description and impact
- Steps to reproduce
- Affected route or component
- Any suggested mitigation

You can expect an acknowledgement within a few days. Please allow time for a fix before public disclosure.

## Security posture

- GenAI credentials are server-only (`GROQ_API_KEY` / `AI_API_KEY`), never `NEXT_PUBLIC_`.
- Chat requests are same-origin checked, size-capped and rate-limited.
- All profile and air data entering the server is clamped and enum-validated.
- Model output is flattened to plain text, React-escaped, and passed through a narrow safety guard.
- Unsafe or failed model output falls back to deterministic logic.
- Security headers and a restrictive CSP are configured in `next.config.ts`.
- No analytics, cookies or user accounts.
- Dependency audit is part of normal maintenance (`npm audit`).
