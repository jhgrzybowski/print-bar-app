## Project role

You are building the React web frontend for a LAN printing application powered by `local_printer_api` repo.

The frontend is a calm, minimal, neumorphic SaaS-style printing cockpit with a ChatGPT-like workflow. The app should make local printing feel predictable, visual, user has to feel taken care of.

The user should always know three things immediately:

1. Printer status.
2. Selected file.
3. How the file will be printed.

---

## Product concept

This is not a generic printer dashboard.

The app uses a chatbot-style workflow where each “chat” is a print flow history.

Examples of print flows:

- Uploaded `Invoice_May.pdf` → printed 2 pages with current settings.
- Uploaded `Contract.pdf` → printed page 1 → printed page 2 later.
- Uploaded a file → file was too large → uploaded another file.
- Uploaded image → changed orientation → printed in grayscale.
- Uploaded file → job cancelled because wrong size.

Chat history becomes print history.  
Assistant messages become print guidance.  
The uploaded file becomes the central object.  
The right panel controls print output.

---

## Design direction

The UI should feel:

- calm
- zen
- minimalistic
- soft
- premium
- reliable
- practical
- slightly futuristic

Use restrained neumorphism / soft UI. Avoid a busy dashboard look.

The design should feel like one cohesive rounded SaaS shell, not a collection of disconnected cards.

Default visual mood:

- soft neutral background
- warm peach/orange gradient glow
- rounded shell
- dark left sidebar
- light central workspace
- light right preferences panel
- warm orange/coral as the main action accent

Avoid:

- candy-like colors
- excessive gradients
- overly playful icons
- dense dashboards
- unnecessary decorative images
- hard shadows
- visual clutter

---

## Layout

Use a three-column desktop layout:

```css
grid-template-columns: 230px minmax(0, 1fr) 260px;
````

### Left panel

Purpose: printer identity, status, latest print flows, profile area.

Contains:

* printer name
* live status indicator
* quick metadata
* latest print flows
* selected flow state
* bottom profile selector

Example:

```text
Canon MG5350
Online · Ready

Latest Prints
- Invoice_May.pdf
- Shipping_Label.png
- Notes.txt

Profile
```

### Main panel

Purpose: primary print workspace.

Contains:

* current flow title
* upload zone before upload
* file preview after upload
* assistant/system messages
* action chain / print flow timeline
* bottom chat-style command bar

The main panel is the visual priority.

### Right panel

Purpose: print preferences and job execution.

Contains:

* copies
* page range
* color / grayscale
* paper size
* orientation
* duplex
* quality
* scale / fit to page
* printer profile
* advanced options
* primary Print button

---

## Responsive behavior

Desktop:

* left, main, and right panels visible.

Tablet:

* right preferences panel becomes collapsible.

Mobile:

* left printer/history panel becomes a slide-over drawer.
* right preferences panel becomes a slide-over drawer.
* main upload/chat workflow stays full-width.

Do not sacrifice the central file preview and command flow on smaller screens.

---

## Typography

Use:

```css
font-family: Inter, SF Pro Display, system-ui, sans-serif;
```

Recommended hierarchy:

* panel titles: 15–16px, 600
* printer name: 14–15px, 600
* status text: 11–12px
* latest print filename: 12–13px, 500
* latest print metadata: 10–11px, muted
* upload title: 16–18px, 600
* assistant messages: 13px
* file metadata: 11–12px
* preference labels: 11–12px
* preference controls: 12–13px
* primary button: 13–14px, 600

Long filenames must truncate gracefully and expose full names via tooltip/title or expandable detail.

---

## Color tokens

Use centralized theme tokens. Do not hardcode colors across components.

Suggested base tokens:

```css
--sidebar-bg: #252834;
--sidebar-active: #343744;
--main-bg: #f7f7f6;
--panel-bg: #ffffff;
--border-soft: #ececec;
--text-primary: #111111;
--text-secondary: #6f737d;
--text-muted: #a0a3aa;

--accent: #ff7a45;
--accent-soft: #ffb088;
--accent-bg: #fff0e8;

--ready: #34c77b;
--warning: #f59e0b;
--error: #ef4444;
--offline: #9ca3af;
```

Status colors should be used as small signals only.

---

## Profile and theme system

The app should support different user/profile themes.

Each profile may define:

```ts
type PrinterProfile = {
  id: string;
  name: string;
  avatarLabel: string;
  accentColor: string;
  accentSoftColor: string;
  accentBgColor: string;
  defaultSettings?: Partial<PrintSettings>;
};
```

Example profiles:

* Zen Coral
* Soft Blue
* Graphite
* Warm Paper
* Minimal Pink

Changing profile should update accent highlights and optionally default print settings.

Keep profile switching simple in early milestones. Local mock state is enough.

---

## Core frontend types

Use TypeScript and define clear domain types.

Suggested types:

```ts
type PrinterStatus = "ready" | "warning" | "error" | "offline";

type UploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  previewUrl?: string;
};

type PrintActionType =
  | "file_uploaded"
  | "preview_generated"
  | "settings_changed"
  | "print_submitted"
  | "print_completed"
  | "print_cancelled"
  | "warning"
  | "error"
  | "assistant_message";

type PrintAction = {
  id: string;
  type: PrintActionType;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type PrintSettings = {
  copies: number;
  pageRange: "all" | string;
  colorMode: "color" | "grayscale";
  paperSize: "A4" | "A5" | "Letter" | string;
  orientation: "portrait" | "landscape";
  duplex: "none" | "long-edge" | "short-edge";
  quality: "draft" | "normal" | "high";
  fitToPage: boolean;
};

type PrintChat = {
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

## State management

For early milestones, use local state or Zustand.

State should support:

* selected print chat
* list of print chats
* selected profile/theme
* printer status
* current print settings
* mocked uploaded file
* mocked action chain

Do not add backend persistence yet.

---

## Backend integration expectations

The future backend is `local_printer_api`.

Expected future endpoints:

* `/health`
* `/status`
* `/options`
* `/files`
* `/files/{file_id}/preview`
* `/print`
* `/jobs`
* `/jobs/{job_id}`

Do not deeply integrate the API in milestone 1 unless explicitly requested.

Prepare the code so API integration can be added cleanly later through an API client layer, for example:

```text
src/api/printerApi.ts
```

Do not call backend endpoints directly from deeply nested UI components.

---

## UI behavior rules

### Upload state

Before upload:

* show a large calm upload zone
* supported formats: PDF, image, text
* allow click and drag/drop visually, even if mocked first

After upload:

* show file preview card
* show metadata
* show assistant message
* enable print settings
* enable print CTA if printer is ready

### Print button

Primary Print button should be disabled until:

* a file is selected
* printer is online/ready
* settings are valid

### Assistant messages

Use short practical messages.

Good:

```text
File detected: PDF, 4 pages.
Ready to print with current settings.
```

Good:

```text
Large file detected. Consider grayscale or custom page range.
```

Bad:

```text
Amazing! Your wonderful document is ready for a magical print journey.
```

The tone should be calm and useful, not overly enthusiastic.

---

## Accessibility

Implement basic accessibility from the start:

* visible focus states
* semantic buttons
* keyboard-accessible controls
* aria labels for icon-only buttons
* sufficient contrast
* no information conveyed only by color
* readable disabled states

---

## Out of scope unless explicitly requested

Do not implement:

* authentication
* database
* cloud sync
* multi-user permissions
* full backend integration
* real PDF rendering
* real print submission
* complex job polling
* WebSockets/SSE
* multi-printer management
* advanced preset persistence

---

## Quality expectations

Before finishing work:

* TypeScript should compile.
* App should run locally.
* Components should be readable and maintainable.
* Styling should use shared tokens.
* Mock data should be realistic.
* Layout should match the three-panel design.
* UI should remain calm, minimal, and product-like.

Do not leave large dead code, unused components, or unfinished placeholder text unless clearly marked as mock/demo content.

---

## Preferred implementation style

* Always verify your work
* Make small, coherent commits.
* Prefer simple components over clever abstractions.
* Keep business/domain types explicit.
* Do not over-engineer early.
* Avoid introducing heavy UI libraries unless necessary.
* Preserve visual consistency over adding many features.
* Build the foundation so later backend integration is straightforward.