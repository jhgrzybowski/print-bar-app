# Design

## Design Direction

Print Bar uses a restrained product UI: tinted neutral surfaces, one profile-driven accent, soft edges, compact controls, and a three-column desktop cockpit. The scene is a focused person at a desk in normal ambient light, checking a local printer before sending a document they do not want to waste paper on.

## Color

Use centralized CSS custom properties. Neutrals should be subtly warm and expressed in OKLCH where practical. The default accent is warm coral, used for the primary print action, active flow state, selected controls, and small readiness highlights.

Core roles:

- App background: soft warm neutral.
- Shell surface: quiet off-white.
- Sidebar: muted graphite.
- Main workspace: warm near-white.
- Right panel: clean near-white.
- Accent: profile-controlled coral, pink, graphite, or soft blue.
- Status: ready, warning, error, offline as small functional signals only.

## Typography

Use `Inter, SF Pro Display, system-ui, sans-serif` as specified by the project brief. Keep type compact and task-focused:

- Panel titles: 15-16px, 600.
- Printer name: 14-15px, 600.
- Status and metadata: 11-12px.
- Flow filenames: 12-13px, 500.
- Assistant messages: 13px.
- Preference controls: 12-13px.
- Primary action: 13-14px, 600.

Long filenames truncate in lists and expose the full value through a `title` attribute.

## Layout

Desktop uses a fixed three-column grid:

```css
grid-template-columns: 230px minmax(0, 1fr) 260px;
```

The main workspace is visually primary. The left panel owns printer identity and flow history. The right panel owns print output decisions and execution. Tablet and mobile can collapse side panels later, but the central file preview and command flow must remain the protected experience.

## Components

Use simple product components rather than decorative cards. Buttons have consistent radii, clear hover/focus/disabled states, and no gradient fills. Settings use native form controls with visible labels. Assistant guidance is brief and practical.

## Motion

Use short 150-200ms transitions for color, border, and background feedback. Avoid decorative motion and layout animation.

## Milestone 1 Scope

Milestone 1 is mocked only: no backend calls, real uploads, PDF rendering, printing, auth, persistence, polling, or multi-printer management. The code should define domain types, keep mock data outside UI components, and include an API client layer placeholder for future endpoints.
