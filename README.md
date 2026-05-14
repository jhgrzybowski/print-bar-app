# Print Bar App

React web app shell for a local LAN printing cockpit.

## Backend

The app talks to `local_printer_api`. Configure the backend URL with:

```bash
VITE_PRINTER_API_BASE_URL=http://localhost:8000
```

If the variable is not set, the app defaults to `http://localhost:8000`.

## Commands

```bash
npm install
npm run dev
npm run build
```

Milestone 2 connects the frontend to `local_printer_api` for status, options,
upload, preview, print submission, jobs, and job cancellation. Mocked flows
remain visible only as demo history.
