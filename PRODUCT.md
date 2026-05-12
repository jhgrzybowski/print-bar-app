# PRODUCT.md

## Product role

This frontend is a React web application for a LAN printing system powered by the `local_printer_api` backend.

The product is a calm, minimal, neumorphic printing cockpit with a ChatGPT-like workflow. It should make local printing feel predictable, visual and controlled. The user should always understand three things immediately:

1. Printer status.
2. Selected file.
3. How the file will be printed.

The frontend should not feel like a generic printer dashboard. It should feel like a guided print workspace where each print session becomes a clear, readable action history.

---

## Product concept

The core product metaphor is: **a print flow is a chat**.

Each chat represents one print journey. The chat history is not conversational for its own sake; it is a structured history of actions, decisions, warnings and outcomes.

Example flows:

- Uploaded `Invoice_May.pdf` → printed 2 pages with current settings.
- Uploaded `Contract.pdf` → printed page 1 → printed page 2 later.
- Uploaded file → file was too large → uploaded another file.
- Uploaded image → changed orientation → printed in grayscale.
- Uploaded file → job cancelled because wrong size.

In the product model:

- Chat history becomes print history.
- Assistant messages become short print guidance.
- The uploaded file becomes the central object.
- The right panel controls print output.
- The printer state determines what actions are available.

---

## Core user promise

The app should reduce uncertainty around printing.

The user should not need to guess whether:

- the printer is ready,
- the file has been accepted,
- the preview exists,
- the selected settings are valid,
- the job can be submitted,
- something failed.

The UI should surface these states calmly and directly.

---

## Primary user journey

### 1. Open app

The user lands in a three-panel printing cockpit.

They immediately see:

- printer identity and live status,
- latest print flows,
- central upload or preview area,
- current print settings,
- disabled or enabled print action.

### 2. Select or start a print flow

The user can select a previous flow from the left panel or start a new one.

Each flow has:

- title,
- status,
- optional uploaded file,
- current print settings,
- action chain,
- last update timestamp.

### 3. Upload file

Before upload, the main workspace shows a large calm upload zone.

Supported formats shown in the UI:

- PDF,
- image,
- text.

Early implementation may mock upload behavior, but the UI should already imply click and drag/drop support.

### 4. Inspect file

After upload, the central workspace shows:

- file preview card,
- filename,
- file type,
- size,
- page count if available,
- assistant guidance message,
- action chain update.

### 5. Adjust settings

The right panel lets the user configure print output:

- copies,
- page range,
- color or grayscale,
- paper size,
- orientation,
- duplex,
- quality,
- scale / fit to page,
- printer profile,
- advanced options.

Settings changes should appear as part of the print flow when useful.

### 6. Submit print job

The Print button is enabled only when:

- a file is selected,
- printer is ready or online,
- settings are valid.

When disabled, the UI should make the reason understandable without noise.

---

## Product tone

The assistant tone should be short, practical and reassuring.

Good examples:

```text
File detected: PDF, 4 pages.
Ready to print with current settings.
```

```text
Large file detected. Consider grayscale or a custom page range.
```

```text
Printer is offline. Check connection before submitting this job.
```

Avoid overly playful or exaggerated copy:

```text
Amazing! Your wonderful document is ready for a magical print journey.
```

The tone should feel calm, precise and useful.

---

## Functional scope: milestone 1

Milestone 1 should focus on a polished frontend foundation, not full backend behavior.

Include:

- three-panel desktop shell,
- mocked printer status,
- mocked print chats,
- selected chat state,
- mocked upload state,
- file preview placeholder,
- print settings panel,
- disabled/enabled print CTA logic,
- profile/theme selector with local state,
- realistic mock action chain,
- shared TypeScript domain types,
- shared design tokens,
- clean API client placeholder.

Do not implement full backend integration yet unless explicitly requested.

---

## Out of scope for early milestones

Do not implement:

- authentication,
- database,
- cloud sync,
- multi-user permissions,
- full backend integration,
- real PDF rendering,
- real print submission,
- complex job polling,
- WebSockets or SSE,
- multi-printer management,
- advanced preset persistence.

Mock clearly where needed, but avoid fake functionality that appears production-ready.

---

## Backend integration expectations

The future backend is `local_printer_api`.

Expected future endpoints:

```text
GET    /health
GET    /status
GET    /options
POST   /files
GET    /files/{file_id}/preview
POST   /print
GET    /jobs
GET    /jobs/{job_id}
```

Prepare the frontend for clean integration through an API layer such as:

```text
src/api/printerApi.ts
```

Do not call backend endpoints directly from deeply nested UI components.

Recommended direction:

- UI components receive data and callbacks.
- State layer coordinates selected chat, settings and printer status.
- API layer owns backend communication.
- Domain types are shared and explicit.

---

## Core frontend domain types

```ts
export type PrinterStatus = "ready" | "warning" | "error" | "offline";

export type UploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  previewUrl?: string;
};

export type PrintActionType =
  | "file_uploaded"
  | "preview_generated"
  | "settings_changed"
  | "print_submitted"
  | "print_completed"
  | "print_cancelled"
  | "warning"
  | "error"
  | "assistant_message";

export type PrintAction = {
  id: string;
  type: PrintActionType;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type PrintSettings = {
  copies: number;
  pageRange: "all" | string;
  colorMode: "color" | "grayscale";
  paperSize: "A4" | "A5" | "Letter" | string;
  orientation: "portrait" | "landscape";
  duplex: "none" | "long-edge" | "short-edge";
  quality: "draft" | "normal" | "high";
  fitToPage: boolean;
};

export type PrintChat = {
  id: string;
  title: string;
  status: "draft" | "ready" | "queued" | "printed" | "cancelled" | "error";
  file?: UploadedFile;
  settings: PrintSettings;
  actions: PrintAction[];
  updatedAt: string;
};
```

---

## Profile and theme system

The app should support lightweight profile themes.

Each profile may define:

```ts
export type PrinterProfile = {
  id: string;
  name: string;
  avatarLabel: string;
  accentColor: string;
  accentSoftColor: string;
  accentBgColor: string;
  defaultSettings?: Partial<PrintSettings>;
};
```

Suggested profiles:

- Zen Coral,
- Soft Blue,
- Graphite,
- Warm Paper,
- Minimal Pink.

Changing profile should update accent highlights and may optionally update default print settings.

Keep profile switching simple in early milestones. Local mock state is enough.

---

## State management

For early milestones, use local React state or Zustand.

State should support:

- selected print chat,
- list of print chats,
- selected profile/theme,
- printer status,
- current print settings,
- mocked uploaded file,
- mocked action chain.

Avoid over-engineering. The state model should be easy to replace or extend when backend integration is added.

---

## Product behavior rules

### Upload state

Before upload:

- show a large calm upload zone,
- show supported formats,
- visually support click and drag/drop,
- keep the area uncluttered.

After upload:

- show file preview card,
- show metadata,
- show assistant message,
- enable settings,
- enable print CTA only if printer is ready and settings are valid.

### Print CTA

The primary Print button should be disabled until all required conditions are met.

Required conditions:

- selected file exists,
- printer status is `ready`,
- settings are valid.

The disabled state should be readable and visually intentional.

### Action chain

The action chain should show important events only.

Good action examples:

- File uploaded,
- Preview generated,
- Settings changed,
- Print submitted,
- Print completed,
- Warning,
- Error,
- Job cancelled.

Avoid logging every tiny UI interaction if it does not help the user understand the print flow.

---

## Accessibility requirements

Implement basic accessibility from the start:

- semantic buttons,
- keyboard-accessible controls,
- visible focus states,
- aria labels for icon-only controls,
- sufficient contrast,
- no information conveyed only by color,
- readable disabled states,
- graceful truncation for long filenames with tooltip or expandable detail.

---

## Quality bar

Before finishing frontend work:

- TypeScript should compile.
- App should run locally.
- Main layout should match the three-panel concept.
- Mock data should be realistic.
- Styling should use shared tokens.
- Components should be readable and maintainable.
- There should be no large dead code blocks.
- Placeholder behavior should be clearly mock/demo behavior.
- The UI should remain calm, minimal and product-like.
