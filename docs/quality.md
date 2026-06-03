# TT — Quality Bar

This is the minimum standard for every PR. QA must confirm all items before issuing `VERDICT: PASS`.

---

## 1. TypeScript

- **`tsc --noEmit` must exit 0** — zero type errors, no suppressions.
- **No `as any`** — ever. Use proper generics (e.g. `app.db.query<Entry>(...)`) or narrow types explicitly.
- **No `@ts-ignore` / `@ts-expect-error`** — if the SDK types don't fit, fix the usage, not the types.
- All `app.db.query<T>()` calls must pass `<T>`. Raw `unknown` rows cause cascade errors.
- `user.login` for display; `user.id` as DB key. Writing `user.name` or `user.email` → `tsc` error.
- `result.meta.last_row_id` (snake_case) from `app.db.execute()` — not `lastRowId`.
- `app.storage.list()` returns `{ key, size, uploaded }[]` — field is `.key`, not `.name`.

---

## 2. Lint

- ESLint with `@typescript-eslint/recommended` — no warnings allowed in CI.
- `react-hooks/exhaustive-deps` rule enabled — `useEffect` deps must be complete.
- No unused imports or variables.

---

## 3. Import path correctness

| What | Correct import | Wrong (fails `tsc`) |
|------|---------------|--------------------|
| `initPro` | `@proappstore/sdk` | `@freeappstore/sdk` |
| Hooks (`useProAuth`, `useProGate`, etc.) | `@proappstore/sdk/hooks` | `@proappstore/sdk` |
| UI components (`SignInButton`, `Avatar`, etc.) | `@proappstore/sdk/ui` | `@proappstore/sdk` |
| `ProShell` | `@proappstore/sdk/shell` | `@proappstore/sdk/ui` |

---

## 4. SDK usage rules

| Rule | Detail |
|------|--------|
| No `app.auth.signIn('apple')` | Apple is not a valid provider — fails `tsc` |
| No `<SignInButton provider=...>` | `SignInButton` props are ONLY `{ app, label? }` |
| No custom roles table | Use `app.roles` exclusively |
| No hardcoded `user.id` checks | Use `app.roles.check()` for permission gating |
| `app.db.execute()` has no `.rows` | Only `app.db.query<T>()` returns rows |
| All DB dates as ISO-8601 strings | SQLite has no DATE type; store as TEXT |
| Tags serialised as JSON string | Parse/stringify on read/write; column is TEXT |

---

## 5. Accessibility (a11y)

- Every `<input>` must have an associated `<label>` (explicit `htmlFor` or wrapping label).
- Every icon-only button must have `aria-label`.
- Colour alone must not convey meaning — project colours get a text label too.
- Focus ring must be visible: Tailwind `focus:ring-2 focus:ring-indigo-500 focus:outline-none`.
- Modal/dialog must trap focus and close on `Escape`.
- Time duration displays must have a human-readable `aria-label` (e.g. `aria-label="2 hours 30 minutes"`).
- Contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text (WCAG AA).

---

## 6. Mobile / responsive

- All pages functional at 375 px viewport width (iPhone SE).
- Touch targets ≥ 44 × 44 px (Tailwind `min-h-[44px] min-w-[44px]`).
- No horizontal scroll on any page.
- Bottom tab bar on mobile (≤ 640 px) — top navigation is hidden.
- Test with browser devtools device emulation before marking a ticket done.

---

## 7. Performance

- No `useEffect` that fetches without a loading/error state.
- DB queries are paginated or date-bounded — never `SELECT * FROM entries` without a `WHERE` clause.
- `app.ai.chat()` calls are gated behind a loading spinner; disable the button while pending.
- Images (avatars) use `app.storage.publicUrl()` for cached R2 URLs, not direct download.

---

## 8. Security / correctness

- Every DB write must include the current `user.id` in the `WHERE` clause (or as a column value) to prevent cross-user data access.
- Pro-gated features (`app.ai`, team reports, notifications) must check subscription before executing — use `useProGate` or `app.subscription.status()`.
- `app.roles.check()` gating for team page — never rely on client-side role state alone for data writes.

---

## 9. QA checklist (per ticket)

- [ ] `tsc --noEmit` passes
- [ ] ESLint passes with zero warnings
- [ ] No `as any`, `@ts-ignore`, or `@ts-expect-error`
- [ ] All acceptance criteria in the ticket are met
- [ ] Works at 375 px width without horizontal scroll
- [ ] All interactive elements keyboard-accessible
- [ ] Dark mode renders correctly
- [ ] No console errors in browser
- [ ] Loading and empty states present
- [ ] Destructive actions have confirmation
