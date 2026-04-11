# Server Storage

This directory is used for persistent local backend state.

Runtime-created file:

- `app-state.json`: admin users, hashed passwords, active sessions, UI overrides, and audit log entries.

Notes:

- `app-state.json` is intentionally ignored by git.
- The backend creates the file automatically on first run.
- The base dataset remains in `star-ops-master-data.json`; storage only holds persistent overrides and auth state.