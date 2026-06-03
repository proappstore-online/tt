# TT — Time Tracker · Knowledge Base

> **Ground truth for BA, Dev, and QA.** All decisions here are binding.
> App ID: `tt` · Subdomain: `tt.proappstore.online` · Stack: React + TypeScript + Vite + Tailwind + PAS SDK (Pro)

---

## 1. What is TT?

TT is a **personal and team time-tracking web app** built on ProAppStore. Users log time entries against projects and tags, view summaries and reports, and — for Pro subscribers — get AI-powered insights and team/shared project views. It is focused, fast, and opinionated: start a timer or add entries manually, see where your time went.

### Positioning
> **TT is the time tracker for knowledge workers who want to understand their week, not just log it.**
> Fast to start, simple to review, and the only tracker that tells you what your data means in plain English.

TT differentiates on three axes competitors don't own:
1. **AI-native** — plain-English weekly digest (no competitor has this)
2. **Simplicity as a feature** — opinionated and lean; incumbents are feature-bloated
3. **Productivity framing, not billing** — for "where did my week go?" users, not invoicing users

---

## 2. Who is it for?

| Persona | Description |
|---------|-------------|
| **Solo freelancer** | Tracks billable hours per client/project. Needs quick entry + daily/weekly totals. |
| **Knowledge worker** | Tracks focus time across internal projects. Cares about personal productivity trends. |
| **Small team (Pro)** | Owner creates shared projects; members log time; owner/moderator sees aggregate reports. |

---

## 3. Core Features (MVP)

| # | Feature | Auth required | Pro required |
|---|---------|--------------|-------------|
| 1 | **Start / stop timer** — one active timer per user | Yes | No |
| 2 | **Manual entry** — add/edit/delete time entries with start, end, description, project, tags | Yes | No |
| 3 | **Projects** — create/archive personal projects with a colour label | Yes | No |
| 4 | **Tags** — free-form tags on entries for cross-project slicing | Yes | No |
| 5 | **Daily / weekly summary** — total hours by project, bar chart | Yes | No |
| 6 | **Reports** — date-range filter, group by project or tag, CSV export | Yes | No |
| 7 | **AI weekly digest** — natural-language summary of the week's work patterns | Yes | **Yes** |
| 8 | **Team projects** — owner creates shared projects; members log time against them | Yes | **Yes** |
| 9 | **Team report** — owner/moderator sees aggregate entries per member | Yes | **Yes** |

---

## 4. Explicit Non-Goals (out of scope)

- **Invoicing / billing** — no invoice generation or Stripe billing integration per project.
- **Calendar sync** — no Google Calendar or iCal export.
- **Mobile native app** — web only; responsive but not a PWA install flow.
- **Time-off / leave management** — not an HR tool.
- **Integrations** (Jira, GitHub Issues, Toggl import) — future work only.
- **Multi-workspace** — one app instance; no per-user workspace isolation beyond project ownership.
- **Real-time collaborative editing** — entries are personal; no live co-editing of records.
- **Passive/auto-tracking** — no desktop daemon; manual timer only.
- **Employee surveillance** — no screenshots, GPS, or per-minute monitoring.

---

## 5. Roles & Permissions (via `app.roles` — built-in RBAC)

| Role | Who | Capabilities |
|------|-----|--------------|
| `owner` | App creator (auto-assigned) | Full access; team reports; assign/revoke roles; see `listAll()` |
| `moderator` | Designated team leads | See team aggregate reports; cannot manage roles |
| `member` | Any signed-in user | Full personal time tracking; join shared projects |

> **Rule:** Never create a custom roles table. Use `app.roles` exclusively. On first sign-in, no explicit role grant is needed — the app treats any authenticated user as a `member` functionally. The `owner` role is auto-assigned by the platform.

---

## 6. File Map (once built)

```
src/
  main.tsx           # initPro, mount
  App.tsx            # ProShell wrapper + routing
  lib/
    app.ts           # singleton initPro({ appId: 'tt' })
    db.ts            # migrate() call + typed query helpers
  pages/
    Timer.tsx        # active timer + quick entry
    Entries.tsx      # entry list + edit/delete
    Projects.tsx     # project CRUD
    Reports.tsx      # reports + CSV export
    Team.tsx         # team reports (Pro + owner/moderator)
    Profile.tsx      # ProProfilePage wrapper
  components/
    EntryForm.tsx
    ProjectBadge.tsx
    DurationDisplay.tsx
    WeekChart.tsx
    AIDigest.tsx     # app.ai.chat wrapper (Pro)
docs/                # this KB
```

---

## 7. References

- PAS SDK guide: https://proappstore.online/skills.md
- PAS Docs: https://proappstore.online/docs
- UI components: https://proappstore.online/docs/ui
- Sub-documents:
  - [`docs/data-model.md`](docs/data-model.md)
  - [`docs/sdk-plan.md`](docs/sdk-plan.md)
  - [`docs/design.md`](docs/design.md)
  - [`docs/quality.md`](docs/quality.md)
  - [`docs/competitor-research.md`](docs/competitor-research.md) ← market research
