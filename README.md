# Agent Hijack Shield — Zero-Trust AI Agent Firewall

A local security demo that scans untrusted text for common prompt-injection indicators and independently authorizes every simulated tool action through a backend policy engine. It uses synthetic data and safe mock tools only. It does not send email, access private files, use real credentials, or connect to production systems.

The prompt scanner is an explainable heuristic, not a guarantee. **A low scanner score never grants permission.** Authorization happens independently in the backend and defaults to deny when a tool or action is not explicitly allowed.

## Project layout

- `frontend/` — React, TypeScript, Vite security dashboard.
- `backend/` — FastAPI, SQLAlchemy, SQLite, policy and tool services, and pytest suite.
- `docs/API.md` — API workflows and sample request/response shapes.

## Requirements

- Windows 10/11
- [Python 3.11 or newer](https://www.python.org/downloads/windows/) (check **Add Python to PATH** during installation)
- [Node.js LTS](https://nodejs.org/en/download/)
- [Visual Studio Code](https://code.visualstudio.com/) (Python and Python Debugger extensions are helpful)

Check that Python and Node.js are available in PowerShell:

```powershell
py --version
node --version
npm --version
```

## Run locally in VS Code

Open the project folder in VS Code (`File` → `Open Folder…`). Open two integrated PowerShell terminals (`Terminal` → `New Terminal`) and keep one for each server.

### 1. Create the backend virtual environment

In terminal 1, from the project root:

```powershell
py -3 -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
```

If PowerShell says scripts are disabled, allow scripts for this terminal only, then activate:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\backend\.venv\Scripts\Activate.ps1
```

### 2. Install backend dependencies and initialize SQLite

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

The SQLite database and safe demo policy/tool records are initialized by the application on startup. By default, the generated database is `backend\agent_shield.db`; it stays local and is excluded from Git. The root `.env.example` lists optional process environment settings; Python does not automatically load that file.

### 3. Start the FastAPI backend

In terminal 1, from the project root (with the virtual environment active):

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Confirm the API health at <http://127.0.0.1:8000/api/health>. Explore and try requests in the interactive API documentation at <http://127.0.0.1:8000/docs>.

### 4. Start the React dashboard

In terminal 2, from the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://127.0.0.1:5173> in your browser. Leave both terminal servers running while using the app.

### 5. Run tests and build checks

In a PowerShell terminal from the project root, activate the virtual environment if needed:

```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m pytest backend\tests -q
```

For the frontend production type-check and build (Node.js/npm must be installed):

```powershell
cd frontend
npm run build
```

## Demo flows

- **Safe scan:** Use Attack simulator → Safe report → Run security scan.
- **Prompt injection:** Scan the Prompt injection or Webpage override preset and review the risk explanation.
- **Unauthorized data access:** In Tool firewall, submit the default protected synthetic record request; the policy engine must block it independently of scanner output.
- **Unauthorized destination:** Try a simulated email destination that is not allow-listed; no real email is sent.
- **Approval flow:** Run case E in Attack simulator, then review it in Approval center. After approving, return to the simulator and run case E again to request execution. The backend requires a fresh policy check and exact argument binding; a human approval alone does not override current policy.
- **Scanner-missed attack:** Directly submit a disallowed tool action through Tool firewall. This path demonstrates policy enforcement independent of the text scanner.
- **Evaluation:** Run labelled scanner and authorization cases; the UI reports measured results, not claimed scanner guarantees.

## Configuration and safety

- The default deployment binds to loopback (`127.0.0.1`) and uses local SQLite.
- Use synthetic demo data only. Never put passwords, API keys, personal information, or real confidential content in the app.
- Policy administration and approval endpoints are intentionally suitable only for a local hackathon demonstration. They do not provide production authentication or reviewer identity assurance. Do not expose the API to a network or use it to protect real agents without adding authenticated authorization, secure deployment, and a security review.
- The baseline scanner may miss attacks and may flag benign content. It is not a substitute for authorization controls.

## Troubleshooting

**`py` or `python` is not recognized:** Install Python and enable **Add Python to PATH**, then open a new VS Code terminal. `py --version` should work.

**PowerShell blocks activation:** Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in the current terminal and try the activation command again.

**Port 8000 or 5173 is occupied:** Stop the other local app using that port, or change the corresponding `--port` in the Uvicorn command / `server.port` in `frontend/vite.config.ts`. Update `VITE_API_BASE_URL` and backend `CORS_ORIGINS` if changing the frontend port.

**Browser reports a CORS error:** Keep the frontend at `http://127.0.0.1:5173` or `http://localhost:5173`, check that the backend is running, then verify its configured origins include the exact frontend origin.

**Database initialization or locked database errors:** Stop the backend, ensure the project directory is writable, and restart. SQLite files are disposable local demo data; preserve them if you need the audit history. Do not delete them while the API is running.

**Frontend shows API unavailable:** Confirm `http://127.0.0.1:8000/api/health` loads and that `frontend/.env` points to `http://127.0.0.1:8000/api`; restart Vite after changing `.env`.

## Four-person GitHub collaboration

Suggested parallel branches:

- `feat/frontend-dashboard` — dashboard screens, interaction, responsive styling.
- `feat/scanner-evaluation` — heuristic scanner, risk levels, labelled scanner cases.
- `feat/policy-database` — persistence, tool policy, authorization and approval flows.
- `feat/integration-tests` — API contract, end-to-end integration and test coverage.

Use small commits with the conventional format `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, or `chore: ...`. Open pull requests against the shared default branch, describe changed behavior and test commands, ask another teammate for review, and merge only after required tests pass. Avoid committing `.env`, virtual environments, generated databases, `node_modules`, or other local state.

The API surface and sample payloads are documented in [docs/API.md](docs/API.md). Keep frontend and backend changes compatible by updating the contract examples and tests when a request/response shape changes.

## License

This demo is provided for local educational and hackathon use. Review the dependency licenses before redistribution.
