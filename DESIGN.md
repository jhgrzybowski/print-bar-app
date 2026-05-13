# DESIGN.md

## Design role

This document defines the visual and interaction direction for the React frontend of the LAN printing application.

The interface should feel like a calm, premium, neumorphic SaaS printing cockpit with a ChatGPT-like workflow. It should be practical first, visually soft second. The design exists to make local printing feel predictable, not decorative.

The user should immediately understand:

1. Printer status.
2. Selected file.
3. Print output settings.

---

## Visual direction

The UI should feel:

- calm,
- zen,
- minimalistic,
- soft,
- premium,
- reliable,
- practical,
- slightly futuristic.

Use restrained neumorphism / soft UI. The design should feel like one cohesive rounded SaaS shell, not a collection of disconnected cards.

Preferred mood:

- soft neutral page background,
- warm peach/orange gradient glow,
- one rounded application shell,
- dark left sidebar,
- light central workspace,
- light right preferences panel,
- warm orange/coral action accent.

Avoid:

- candy-like colors,
- excessive gradients,
- overly playful icons,
- dense dashboards,
- unnecessary decorative images,
- hard shadows,
- visual clutter.

---

## Layout structure

Use a three-column desktop layout:

```css
.app-shell {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 260px;
}
```

The layout should read as one integrated shell:

- left panel: printer identity and print flow history,
- main panel: selected file and guided print workflow,
- right panel: print preferences and execution.

The central workspace is the visual priority. The side panels support it; they should not compete with it.

---

## Desktop layout

### Left panel

Purpose: printer identity, status, latest print flows and profile area.

Contains:

- printer name,
- live status indicator,
- quick metadata,
- latest print flows,
- selected flow state,
- bottom profile selector.

Example structure:

```text
Canon MG5350
Online · Ready

Latest Prints
- Invoice_May.pdf
- Shipping_Label.png
- Notes.txt

Profile
```

Visual treatment:

- dark background,
- soft active state,
- subtle separators,
- compact file rows,
- muted metadata,
- status as a small signal, not a large banner.

### Main panel

Purpose: primary print workspace.

Contains:

- current flow title,
- upload zone before upload,
- file preview after upload,
- assistant/system messages,
- action chain / print flow timeline,
- bottom chat-style command bar.

Visual treatment:

- light background,
- generous empty space,
- large central upload/preview area,
- soft inner cards where useful,
- restrained icons,
- clear print flow hierarchy.

### Right panel

Purpose: print preferences and job execution.

Contains:

- copies,
- page range,
- color / grayscale,
- paper size,
- orientation,
- duplex,
- quality,
- scale / fit to page,
- printer profile,
- advanced options,
- primary Print button.

Visual treatment:

- light panel,
- compact control groups,
- clear labels,
- strong but calm primary button,
- disabled state that is visible and intentional.

---

## Responsive behavior

### Desktop

- Left, main and right panels are visible.
- Grid uses `230px minmax(0, 1fr) 260px`.
- Main panel keeps file preview and command flow visually dominant.

### Tablet

- Right preferences panel becomes collapsible.
- Main panel remains visible and usable.
- Left panel may stay visible if width allows.

### Mobile

- Left printer/history panel becomes a slide-over drawer.
- Right preferences panel becomes a slide-over drawer.
- Main upload/chat workflow stays full-width.
- Do not sacrifice the central file preview and command flow.

Mobile priority order:

1. File/upload preview.
2. Assistant guidance/action chain.
3. Command bar.
4. Access to printer/history drawer.
5. Access to preferences drawer.

---

## Typography

Use:

```css
font-family: Inter, SF Pro Display, system-ui, sans-serif;
```

Recommended hierarchy:

| Element | Size | Weight |
| --- | ---: | ---: |
| Panel titles | 15–16px | 600 |
| Printer name | 14–15px | 600 |
| Status text | 11–12px | 400–500 |
| Latest print filename | 12–13px | 500 |
| Latest print metadata | 10–11px | 400 |
| Upload title | 16–18px | 600 |
| Assistant messages | 13px | 400–500 |
| File metadata | 11–12px | 400 |
| Preference labels | 11–12px | 500 |
| Preference controls | 12–13px | 400–500 |
| Primary button | 13–14px | 600 |

Use calm hierarchy. Avoid oversized marketing-style typography inside the app shell.

Long filenames must truncate gracefully and expose full names through `title`, tooltip or expandable detail.

---

## Color system

Use centralized theme tokens. Do not hardcode colors throughout components.

Base tokens:

```css
:root {
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
}
```

### Usage rules

- Accent color is for primary actions, selected states and subtle highlights.
- Status colors should be used as small signals only.
- Avoid large red/yellow/green surfaces unless the state is critical.
- Use neutral surfaces for the main app structure.
- Use soft contrast rather than heavy borders.

---

## Neumorphism and depth

Use restrained soft UI.

Recommended treatment:

- rounded shell,
- subtle outer shadow,
- soft inset states for inputs or selected controls,
- very light borders for structure,
- no harsh drop shadows.

Good:

```css
box-shadow:
  16px 16px 40px rgba(30, 32, 40, 0.08),
  -12px -12px 32px rgba(255, 255, 255, 0.75);
```

Good for inset controls:

```css
box-shadow:
  inset 4px 4px 10px rgba(30, 32, 40, 0.06),
  inset -4px -4px 10px rgba(255, 255, 255, 0.75);
```

Avoid strong, floating card stacks. The app should feel quiet and cohesive.

---

## Component guidance

### App shell

The app shell is the main container. It should be rounded, centered and visually cohesive.

Suggested behavior:

- max-width suitable for desktop SaaS layout,
- full-height or near-full-height viewport,
- rounded corners,
- subtle background glow behind shell,
- overflow handling that keeps panels usable.

### Printer status

Printer status should be visible in the left panel.

Show:

- printer name,
- status dot,
- readable status label,
- optional short metadata.

Do not rely on color alone. Pair status color with text.

### Print flow list

Each flow row should show:

- filename or flow title,
- status,
- last action or metadata,
- selected state.

Rows should be compact and calm. Do not make the history area look like a dense admin table.

### Upload zone

Before upload, this is the main empty state.

It should include:

- clear upload title,
- supported formats,
- large click/drag target,
- subtle icon,
- calm helper text.

Tone example:

```text
Drop a file here or choose from your device.
PDF, image or text files are supported.
```

### File preview

After upload, show a preview-oriented state.

Include:

- preview card or placeholder,
- filename,
- MIME/type label,
- file size,
- page count if known,
- preview generation state if needed.

Real PDF rendering is out of scope for early milestones. Use a clear placeholder rather than pretending full rendering is implemented.

### Assistant messages

Assistant/system messages should be short and practical.

Visual style:

- small soft bubble or message row,
- muted background,
- readable text,
- optional icon only if it improves scanning.

Do not overuse chat bubbles. This is a print workflow, not a social messenger.

### Action chain

The action chain should show meaningful print events.

Use:

- compact timeline,
- small icons or status markers,
- timestamp or relative time,
- concise titles,
- optional description.

Avoid logging every minor control interaction.

### Command bar

The bottom command bar should feel inspired by ChatGPT, but adapted to printing.

Possible actions:

- upload another file,
- add note/command,
- ask for print guidance,
- start a new flow.

In early milestones, it can be mostly visual or mocked.

### Preferences panel

Controls should be grouped logically:

1. Basic output: copies, page range.
2. Appearance: color mode, quality.
3. Paper: size, orientation, fit to page.
4. Handling: duplex.
5. Profile/advanced.

Use native or simple custom controls. Avoid heavy UI libraries unless necessary.

### Primary Print button

The Print button is the strongest action in the interface.

Rules:

- use accent color,
- keep label direct: `Print`, `Print file`, or `Send to printer`,
- disabled until valid,
- show disabled reason nearby or through subtle helper text.

---

## Interaction states

### Ready

- printer status is `ready`,
- file exists,
- settings valid,
- Print button enabled.

### Draft

- no file selected,
- upload zone visible,
- Print button disabled.

### Warning

- file or settings need attention,
- use warning status with short guidance,
- avoid alarming visual treatment unless action is blocked.

### Error

- show clear error message,
- keep recovery path visible,
- do not hide the selected file or settings unless they are invalid.

### Offline

- printer status visible as offline,
- Print button disabled,
- central workspace still usable for upload and setup.

---

## Profile themes

Profiles can change accent colors and optional default settings.

Example profile names:

- Zen Coral,
- Soft Blue,
- Graphite,
- Warm Paper,
- Minimal Pink.

Profile switching should update:

- accent color,
- soft accent color,
- accent background,
- selected state highlights,
- primary button color,
- optional default print settings.

Keep profile switching simple and local in early milestones.

---

## Accessibility

Accessibility is part of the base design, not a later polish pass.

Requirements:

- visible focus states,
- semantic buttons,
- keyboard-accessible controls,
- aria labels for icon-only buttons,
- sufficient text contrast,
- disabled controls remain readable,
- status must include text, not only color,
- long filenames must remain discoverable.

Recommended focus style:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

## Implementation notes

- Prefer simple components over clever abstractions.
- Use shared tokens for colors, spacing, radius and shadows.
- Keep domain types explicit.
- Keep layout behavior predictable before adding visual extras.
- Do not introduce heavy UI libraries unless they solve a real problem.
- Preserve visual consistency over adding many features.

Suggested frontend folders:

```text
src/
  api/
    printerApi.ts
  components/
    layout/
    printer/
    print-flow/
    preferences/
    ui/
  data/
    mockPrintChats.ts
    profiles.ts
  styles/
    tokens.css
  types/
    printer.ts
```

This structure is a guideline, not a strict requirement. The important rule is separation between UI, domain types, mock data and future API integration.
