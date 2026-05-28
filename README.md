# Print Bar App

React frontend for a LAN printing cockpit powered by `local_printer_api`.

The app is built around a print-flow model: upload a file, inspect the preview,
adjust print settings, submit the job, and keep a readable action history for
that print session.

## Features

- Printer health, status, options, jobs, and cancellation through `local_printer_api`.
- File upload, backend preview images, and real print submission.
- Print settings for copies, page range, color/grayscale, paper, orientation,
  duplex, quality, and fit to page.
- Paper-based print preview with compact and large modes.
- Print flow creation, renaming, and timeline-style activity history.
- Calm three-column UI with a dark printer/history sidebar, central preview
  workspace, and right-side settings panel.

## Setup

Install dependencies:

```bash
npm install
```

Set the backend URL. For local development, create `.env.local`:

```bash
VITE_PRINTER_API_BASE_URL=http://192.168.100.99:8000
```

Use the URL where `local_printer_api` is actually running. If this variable is
not set, the app defaults to:

```bash
http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

For the current backend CORS setup, prefer running Vite on port `5173`:

```bash
npm run dev -- --port 5173 --strictPort
```

Build for production:

```bash
npm run build
```

## Docker Deployment

The production Docker deployment builds the app with:

```bash
VITE_PRINTER_API_BASE_URL=/api
```

Nginx serves the static frontend and reverse proxies `/api/*` to
`http://local-printer-api:8000` inside the Docker network. This keeps Docker
service DNS out of the browser and avoids production CORS issues.

Quick start:

```bash
docker compose up -d --build
```

Then open:

```text
http://192.168.100.99/
```

Full deployment and verification details are in `DEPLOYMENT_DOCKER.md`.

## Backend

This app expects `local_printer_api` to be running and reachable from the
browser. Typical checks:

```bash
curl http://192.168.100.99:8000/health
curl http://192.168.100.99:8000/status
```

If your backend is bound to a LAN IP, `http://localhost:8000` may not work.
Point `VITE_PRINTER_API_BASE_URL` at the LAN backend URL instead.

## Troubleshooting

### Upload failed: backend unreachable or blocked by CORS

This usually means one of these is true:

- `local_printer_api` is not running.
- `VITE_PRINTER_API_BASE_URL` points to the wrong host or port.
- The frontend is running on a port the backend does not allow with CORS.

Check the backend first:

```bash
curl http://192.168.100.99:8000/health
```

Then check the frontend origin. If Vite starts on `5174` because `5173` is busy,
either free port `5173` or add the new origin to the backend
`CORS_ALLOWED_ORIGINS`.

Allowed origins must match exactly, including protocol, host, and port, for
example:

```text
http://localhost:5173
http://192.168.100.99:5173
```

### Backend works with curl but not in the browser

This is usually CORS. Make sure the browser origin shown by Vite is listed in
`local_printer_api` CORS settings.

Example Vite origins:

```text
http://localhost:5173
http://192.168.100.99:5173
```

### Frontend cannot reach `localhost:8000`

The backend may be bound to the LAN address only. Use:

```bash
VITE_PRINTER_API_BASE_URL=http://192.168.100.99:8000 npm run dev -- --port 5173 --strictPort
```

### Build fails

Run a clean install and rebuild:

```bash
npm install
npm run build
```

If TypeScript reports errors, fix those before opening a PR.

## Project Docs

- `PRODUCT.md`: product model, user journey, and behavior rules.
- `DESIGN.md`: visual direction, layout, tokens, and interaction guidance.
- `AGENTS.md`: milestone context, architecture rules, and contributor notes.
