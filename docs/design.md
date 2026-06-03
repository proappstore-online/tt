# TT — Design System & UX Conventions

---

## 1. Principles

1. **Speed first** — the most common action (start/stop timer) is always one click from anywhere.
2. **Clarity over density** — show one thing at a time on mobile; expand on desktop.
3. **No surprises** — destructive actions (delete entry) require confirmation.
4. **Accessible by default** — every interactive element must be keyboard-reachable and labelled.

---

## 2. Layout

### Shell
- `ProShell` wraps the entire app (handles auth state, theme, billing UI).
- Fixed top navigation bar (64 px) with app name, active timer indicator, and `<ProfileMenu>`.
- Bottom tab bar on mobile (≤ 640 px) with 4 tabs: Timer, Entries, Projects, Reports.
- Sidebar navigation on desktop (≥ 1024 px): same 4 items + Team (if `owner`/`moderator`).

### Page max-width
- Content area: `max-w-3xl mx-auto px-4` (768 px content, fluid padding).
- Reports page: `max-w-5xl` (wider for charts).

### Responsive breakpoints (Tailwind defaults)
| Breakpoint | Min-width | Layout |
|-----------|-----------|--------|
| default | — | Single column, bottom tabs |
| `md` | 768 px | Two-column form layouts |
| `lg` | 1024 px | Sidebar nav, wider content |

---

## 3. Colour palette

Tailwind + CSS variables; `ProShell` applies `data-theme="dark"` / `"light"` on `<html>`.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-base` | `white` | `gray-950` | Page background |
| `bg-surface` | `gray-50` | `gray-900` | Card / panel background |
| `bg-elevated` | `gray-100` | `gray-800` | Input, dropdown background |
| `text-primary` | `gray-900` | `gray-50` | Body text |
| `text-secondary` | `gray-500` | `gray-400` | Labels, timestamps |
| `accent` | `indigo-600` | `indigo-400` | Primary CTA, active timer indicator |
| `danger` | `red-600` | `red-400` | Delete, destructive actions |
| `success` | `green-600` | `green-400` | Timer running indicator |

> Implement as Tailwind `dark:` variants. Example: `className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50"`.

---

## 4. Typography

- Font: system UI stack (`font-sans`) — no external font load.
- Size scale: `text-sm` (labels), `text-base` (body), `text-lg` (section headers), `text-2xl` (page titles), `text-4xl` (large timer display).
- Timer duration display: monospace (`font-mono`) to prevent layout shift as digits change.

---

## 5. Component conventions

### Timer widget
- Persistent header widget showing elapsed time in `HH:MM:SS` monospace.
- Green pulsing dot when running (`animate-pulse text-green-500`).
- Single "Stop" button (red) when running; "Start" (accent) when idle.
- Tapping the widget on mobile expands to show description + project selector.

### Entry cards
- Compact list rows (not cards on mobile); full card on desktop.
- Duration shown right-aligned in `font-mono`.
- Project shown as a coloured pill badge.
- Edit/delete actions hidden behind a `⋯` overflow menu (accessible with keyboard).

### Project badge
- Small filled circle (8 px) + project name in `text-sm`.
- Colour comes from `project.color` (hex) applied as inline `style={{ backgroundColor: color }}`.

### Forms
- Use `<label>` + `<input>` pairs always; never placeholder-only labels.
- Error messages below the field in `text-red-600 text-sm`.
- Buttons: primary = `bg-indigo-600 text-white hover:bg-indigo-700`; secondary = `border border-gray-300 bg-white`; danger = `bg-red-600 text-white`.

### Empty states
- Friendly illustration placeholder (inline SVG or emoji) + one-line description + CTA button.
- Example: "No entries yet — start your first timer!"

### Loading states
- Skeleton loaders (Tailwind `animate-pulse bg-gray-200 dark:bg-gray-700 rounded`) — no spinner for content areas.
- Full-page loading: `<GateScreen gate="loading" app={app} />` (SDK component).

---

## 6. Dark mode

- `ProShell showThemeToggle` provides the built-in toggle (sun/moon).
- `useTheme()` hook from `@proappstore/sdk/hooks` gives `theme: 'light' | 'dark'` for conditional logic.
- All Tailwind colour classes must have a `dark:` counterpart.
- Charts (WeekChart): swap fills to lighter values in dark mode via `theme` from `useTheme()`.

---

## 7. Motion

- Subtle: entry card slide-in on add (`transition-all duration-200`).
- Timer digits: no animation (monospace prevents jank).
- Respect `prefers-reduced-motion` — wrap all decorative transitions in a CSS media query check or use Tailwind's `motion-safe:` variant.

---

## 8. Page-by-page UX notes

### Timer page (`/`)
1. Hero timer widget (top, full-width on mobile).
2. Description input + project/tag picker below (collapsed by default on mobile).
3. Recent entries list (last 5) with inline stop-timer CTA if active.

### Entries page (`/entries`)
1. Date-range filter bar at top (today / this week / custom).
2. Grouped by day, with day totals.
3. Each entry: time range, duration, project badge, description, overflow menu.

### Projects page (`/projects`)
1. Grid of project cards (colour + name + total hours this week).
2. "New project" button → inline form or modal.
3. Archive toggles a project to a separate "Archived" section.

### Reports page (`/reports`)
1. Date-range picker + group-by selector (project / tag).
2. Bar chart of hours per day.
3. Summary table: project/tag → total hours → % of period.
4. CSV export button.

### Team page (`/team`) — Pro + owner/moderator only
1. Member list with total hours this week.
2. Per-member drill-down: entries list + project breakdown.
3. No editing of other users' entries.

### Profile page (`/profile`)
- `<ProProfilePage app={app} />` — full SDK-managed settings page (subscription, billing, theme, danger zone).
