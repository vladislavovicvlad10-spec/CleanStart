# Security Policy

CleanStart is a safety-first Windows maintenance utility. It does not provide
antivirus detection, malware removal, telemetry, login, analytics, cloud sync, or
external data collection.

## Reporting a Concern

If you find a security or safety issue, please open a GitHub issue with the
`security` label, or contact the maintainer privately if a public report would
expose sensitive details.

Please include:

- CleanStart version.
- Windows version.
- What action was being performed.
- Whether the issue involved cleanup, startup analysis, disk analysis, logging,
  packaging, or documentation.
- Reproduction steps using test files or sanitized paths.

Do not include real private files, tokens, passwords, email addresses, or full
personal file paths in public reports.

## Scope

In scope:

- Unsafe deletion behavior.
- Cleanup actions that bypass preview or confirmation.
- Crashes caused by access-denied or missing files.
- Accidental external communication.
- Packaging problems that include local logs, config, caches, or private data.

Out of scope:

- Requests to add antivirus or malware verdict functionality.
- Reports based only on claims that CleanStart does not "optimize" performance.
- Issues requiring privileged access that normal MVP usage does not request.
