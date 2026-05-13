## Project role

You are building the React web frontend for a LAN printing application powered by `local_printer_api`.

The app is a calm, minimal, neumorphic printing cockpit with a ChatGPT-like print-flow model.

The user should always know:

1. Printer status.
2. Selected file.
3. How the file will be printed.

Detailed product and design guidance lives in:

- `PRODUCT.md`
- `DESIGN.md`

Do not duplicate those documents here. Use this file for implementation rules, architecture boundaries, commands, and current milestone context.

---

## Current milestone

The project is now in **Milestone 2: connect the React app to `local_printer_api`**.

Milestone 1 delivered:

- React + Vite + TypeScript app shell
- mocked print flows
- mocked upload and preview behavior
- profile/theme switching
- print settings panel
- `src/api/printerApi.ts` boundary for future backend integration

Milestone 2 goal:

Replace mocked backend behavior with real calls to `local_printer_api`, while preserving the existing product model and visual experience.

Main priorities:

1. Connect backend health/status.
2. Connect printer options.
3. Replace mocked upload with real file upload.
4. Replace mocked preview with backend preview images.
5. Submit real print jobs.
6. Read and cancel real jobs.
7. Keep raw backend calls out of UI components.

---

## Product model

This is not a generic printer dashboard.

The app uses print flows:

```text
uploaded file → preview generated → settings changed → print submitted → job completed/cancelled/error
```

Each print flow behaves like a chat history, but the content is structured printing activity.

Backend events should become readable print-flow actions, not raw technical logs.

Good action examples:

- File uploaded
- Preview generated
- Settings changed
- Print submitted
- Job completed
- Job cancelled
- Printer offline
- Upload failed

---

## Backend integration

Backend repo:

```text
local_printer_api
```

Frontend backend base URL:

```text
VITE_PRINTER_API_BASE_URL=http://localhost:8000
```

Do not hardcode backend URLs inside components.

Expected endpoints:

```text
GET    /health
GET    /status
GET    /options
POST   /files
GET    /files/{file_id}/preview
GET    /files/{file_id}/preview/{page}
POST   /print
GET    /jobs
GET    /jobs/{job_id}
DELETE /jobs/{job_id}
```

All backend calls must go through:

```text
src/api/printerApi.ts
```

Rules:

- API layer owns `fetch`, URL building, JSON parsing, upload `FormData`, and error normalization.
- UI components receive data and callbacks.
- Do not call backend endpoints directly from nested components.
- Add backend DTO types when useful.
- Map backend DTOs into frontend domain types instead of leaking raw API shapes everywhere.

---

## State management

Use simple React state or Zustand if already introduced.

State should cover:

- selected print flow
- print flows
- selected profile/theme
- appearance mode if implemented
- backend connection state
- printer status
- printer options
- selected/uploaded file metadata
- preview loading/error/page state
- jobs loading/error/list state
- print settings
- action chain events

Do not add a local database or persistent job history in Milestone 2.

Local storage is acceptable only for lightweight UI preferences such as profile/theme/appearance.

---

## Print settings mapping

Frontend `PrintSettings` must be carefully mapped to backend print request options.

Current frontend settings include:

- copies
- page range
- color/grayscale
- paper size
- orientation
- duplex
- quality
- fit to page

Backend options may be printer/CUPS-dependent.

Rules:

- Use `/options` to determine supported capabilities.
- Disable unsupported controls instead of pretending they work.
- Preserve safe defaults if `/options` fails.
- Show calm guidance when a setting is unsupported.
- Do not silently drop user-selected settings without visible feedback when it affects output.

---

## UI behavior rules

### Backend unavailable

The app should remain usable for inspection and setup.

Show:

- backend unreachable state
- printer unavailable/offline state
- refresh action
- short recovery message

Do not crash the shell.

### Upload

Use real `POST /files`.

On success:

- store returned file metadata
- add `file_uploaded` action
- trigger preview loading
- enable print settings

On failure:

- keep current flow
- add `error` action
- show understandable recovery copy

### Preview

Use:

```text
GET /files/{file_id}/preview
GET /files/{file_id}/preview/{page}
```

Initial scope:

- render first preview page
- show page count if available
- support minimal page navigation if straightforward
- handle loading and error states

### Print

Use real `POST /print`.

Print button is enabled only when:

- backend is reachable
- printer is ready
- file exists
- settings are valid

On success:

- add `print_submitted` action
- store job id if returned
- refresh jobs if useful

On failure:

- add `error` action
- preserve file and settings
- show backend error in user-friendly language

### Jobs

Use:

```text
GET /jobs
GET /jobs/{job_id}
DELETE /jobs/{job_id}
```

Initial scope:

- show active/recent jobs
- manual refresh
- cancel job
- reflect cancellation in action chain

Do not add WebSockets/SSE yet.

---

## Design handling

Keep the current visual direction from `DESIGN.md`.

Do not redesign the app during backend integration.

Preserve:

- three-column shell
- calm/neumorphic visual style
- print-flow/chat metaphor
- profile accent themes
- light/dark appearance separation if implemented
- clear printer/file/settings hierarchy

Design changes are allowed only when needed to support real loading, empty, disabled, and error states.

---

## Accessibility

Maintain basic accessibility:

- semantic buttons
- visible focus states
- keyboard-accessible controls
- aria labels for icon-only buttons
- text labels for status, not color alone
- readable disabled states
- visible loading/error states

---

## Out of scope

Do not implement unless explicitly requested:

- authentication
- user accounts
- cloud sync
- local database
- persistent job history
- multi-printer management
- natural-language command parsing
- WebSockets/SSE
- advanced preset persistence
- heavy UI libraries
- major redesign
- backend changes, except tiny local integration fixes such as CORS if absolutely necessary

---

## Commands

Use the project’s package manager as configured in the repo.

Expected commands:

```bash
npm install
npm run dev
npm run build
```

Before finishing work, run:

```bash
npm run build
```

Add or update scripts only if they are genuinely useful.

---

## Code style

- Use TypeScript.
- Keep domain types explicit.
- Prefer simple components over clever abstractions.
- Keep API, state, UI, mock data, and formatting helpers separated.
- Do not leave unused code.
- Do not hide failed backend integration behind mock data.
- Keep mock/demo behavior clearly marked.
- Avoid introducing new dependencies unless they solve a real problem.

---

## Quality checklist

Before finalizing changes:

- App builds successfully.
- Backend base URL is configurable.
- No raw backend calls exist inside nested UI components.
- Health/status integration works or fails gracefully.
- Upload flow handles success and failure.
- Preview flow handles loading and failure.
- Print submission preserves file/settings on failure.
- Jobs can be refreshed and cancelled if backend supports it.
- UI remains calm, minimal, and product-like.