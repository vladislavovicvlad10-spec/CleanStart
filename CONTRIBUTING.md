# Contributing

Thanks for helping improve CleanStart.

## Safety Rules

- Do not add fake performance claims.
- Do not add malware detection claims.
- Do not silently delete files.
- Do not collect personal data.
- Do not send scan results to external servers.
- Prefer reversible actions where possible.
- Keep admin-only behavior optional and clearly explained.

## Development Setup

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
```

## Pull Request Checklist

- The change is scoped and documented.
- Destructive actions require preview and confirmation.
- Permission errors are handled without crashing.
- Tests were added or updated for safety-critical logic.
- README or ROADMAP was updated if user-facing behavior changed.
