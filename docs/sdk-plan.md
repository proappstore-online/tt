# TT — SDK Plan

Exact PAS SDK primitives this app uses. All signatures verified against live docs (`read_docs`). Do **not** invent methods or add fields that don't appear here.

Ref: https://proappstore.online/skills.md · https://proappstore.online/docs

---

## Import map

```ts
import { initPro }                                      from '@proappstore/sdk';          // app instance only
import { useProAuth, useProGate, useProSubscription,
          useProNotifications, useTheme }               from '@proappstore/sdk/hooks';
import { ProShell }                                     from '@proappstore/sdk/shell';
import { Avatar, SignInButton, ThemeToggle, ProfileMenu,
          GateScreen, UpgradeCard, ProProfilePage,
          BillingButton, SubscriptionStatus }           from '@proappstore/sdk/ui';
```

> **Never** import hooks or UI components from `@proappstore/sdk` root — it has no such exports and `tsc` will fail.

---

## 1. App instance

```ts
// src/lib/app.ts — singleton
import { initPro } from '@proappstore/sdk';
export const app = initPro({ appId: 'tt' });
```

---

## 2. Auth

### Initialisation
```ts
await app.auth.init();
app.auth.onChange(user => { /* user: User | null */ });
```

### User shape (EXACT — no other fields exist)
```ts
type User = {
  id: string;             // e.g. "gh:123" — stable DB key
  login: string;          // display name
  avatarUrl: string | null;
  dateOfBirth: string | null;
};
// ❌ user.name   — does NOT exist → tsc error
// ❌ user.email  — does NOT exist → tsc error
```

### Sign-in / out
```ts
app.auth.signIn();              // GitHub (default)
app.auth.signIn('google');      // Google
// ❌ app.auth.signIn('apple') — fails tsc, no apple provider
await app.auth.signInWithEmail(email);  // magic-link
app.auth.signOut();
```

### React hook
```ts
const { user, loading, signIn, signOut, deleteAccount } = useProAuth(app);
// hook's signIn() is zero-arg (GitHub only)
// for Google: call app.auth.signIn('google') directly
```

### Gate pattern
```ts
const { gate } = useProGate(app);
// gate: 'loading' | 'signed-out' | 'upgrade' | 'ready'
if (gate !== 'ready') return <GateScreen gate={gate} app={app} appName="TT" />;
```

---

## 3. Database (`app.db`)

### query — returns rows
```ts
const { rows } = await app.db.query<Entry>(
  'SELECT * FROM entries WHERE user_id = ? ORDER BY started_at DESC',
  [userId]
);
// rows: Entry[]  — always pass <T>, else rows are Record<string,unknown>[] → tsc errors downstream
// returns { rows: T[]; meta: { changes, duration, last_row_id } }
```

### execute — no rows
```ts
const result = await app.db.execute(
  'INSERT INTO entries (id, user_id, ...) VALUES (?, ?, ...)',
  [id, userId, ...]
);
// result: { meta: { changes: number; duration: number; last_row_id: number } }
// ❌ result.rows — does NOT exist on execute result
// ❌ result.meta.lastRowId — wrong case; use last_row_id (snake_case)
```

### batch — transactional
```ts
await app.db.batch([
  { sql: 'DELETE FROM active_timers WHERE user_id = ?', params: [userId] },
  { sql: 'INSERT INTO active_timers VALUES (?, ?, ?)', params: [userId, entryId, now] },
]);
// returns array of { rows, meta } — one per statement
```

### migrate — run once at startup
```ts
await app.db.migrate([
  { id: '001_init', sql: `CREATE TABLE IF NOT EXISTS projects (...)` },
  { id: '002_entries', sql: `CREATE TABLE IF NOT EXISTS entries (...)` },
  { id: '003_timers', sql: `CREATE TABLE IF NOT EXISTS active_timers (...)` },
  { id: '004_indexes', sql: `CREATE INDEX IF NOT EXISTS ...` },
]);
```

---

## 4. Roles (`app.roles`) — RBAC

> **Never** create a custom roles table. All permission gating goes through `app.roles`.

```ts
// assign / revoke (owner-level operation)
await app.roles.assign('gh:456', 'moderator');
await app.roles.revoke('gh:456', 'moderator');

// check current user's role
const isOwner = await app.roles.check('owner');      // → boolean
const isMod   = await app.roles.check('moderator'); // → boolean

// current user's roles
const mine = await app.roles.myRoles(); // → string[]

// list all assignments (owner only)
const all = await app.roles.listAll(); // → RoleAssignment[]
```

### Role-gating pattern in components
```tsx
const [canSeeTeam, setCanSeeTeam] = useState(false);
useEffect(() => {
  app.roles.check('owner')
    .then(isOwner => isOwner ? setCanSeeTeam(true) : app.roles.check('moderator'))
    .then(isMod => isMod && setCanSeeTeam(true));
}, []);
```

---

## 5. Subscriptions

```ts
const sub = await app.subscription.status();
// sub.plan: 'free' | 'pro' (check docs for exact shape)

await app.subscription.openCheckout({ priceId, successUrl, cancelUrl });
await app.subscription.openPortal(returnUrl);
```

### React hook
```ts
const { subscription, loading } = useProSubscription(app);
```

### Pro-gate pattern
```tsx
// useProGate handles subscription check automatically:
// gate === 'upgrade' → render <GateScreen> or <UpgradeCard>
```

---

## 6. AI (`app.ai`) — Pro only

Used for the weekly digest feature.

```ts
// Generate weekly summary narrative
const { text } = await app.ai.chat([
  { role: 'system', content: 'You are a productivity assistant. Be concise.' },
  { role: 'user',   content: `Here is my time data for the week: ${summaryJson}. Write a 3-sentence digest.` },
]);
// returns { text: string }

// Fast model for short summaries
const { text } = await app.ai.generate(prompt, { model: 'fast' });
// 'fast' | 'smart' — default is fast
```

> Gate behind `subscription.status()` — only call `app.ai` for Pro users.

---

## 7. KV (`app.kv`) — per-user preferences

```ts
await app.kv.set('prefs:defaultProject', projectId);   // store
const pref = await app.kv.get<string>('prefs:defaultProject'); // → string | null
await app.kv.delete('prefs:defaultProject');
```

> KV is for UI preferences only — never for core time-tracking data (use `app.db`).

---

## 8. Notifications (`app.notifications`) — Pro only

Used to remind users of a running timer that has been active too long (>4 h).

```ts
// Subscribe (request browser push permission)
await app.notifications.subscribe(); // registers service worker
await app.notifications.isSubscribed(); // → boolean

// Send to a specific user (peer-to-peer, 30/min)
await app.notifications.notifyUser(userId, {
  title: 'Timer still running',
  body: 'You have had a timer running for over 4 hours.',
  url: '/',
  tag: 'timer-running',
});
// → { sent: number; failed: number }

// Unsubscribe
await app.notifications.unsubscribe();
```

### React hook
```ts
const { permission, isSubscribed, subscribe, unsubscribe, loading } = useProNotifications(app);
```

---

## 9. UI Shell

```tsx
// App.tsx — top-level wrapper
import { ProShell } from '@proappstore/sdk/shell';
import { app } from './lib/app';

export default function App() {
  return (
    <ProShell app={app} appName="TT" allowFree showThemeToggle>
      <AppRouter />
    </ProShell>
  );
}
```

### SignInButton — ONLY props: `app` + optional `label`
```tsx
// ✅ correct
<SignInButton app={app} label="Sign in with GitHub" />

// For Google sign-in — render your OWN button:
<button onClick={() => app.auth.signIn('google')}>Sign in with Google</button>

// ❌ wrong — SignInButton has NO provider/onClick prop
<SignInButton app={app} provider="google" />  // tsc error
```

### ProfileMenu
```tsx
<ProfileMenu app={app} showThemeToggle showBilling />
// Props: app (required), showThemeToggle?, showBilling?, children?
```

### GateScreen
```tsx
<GateScreen gate={gate} app={app} appName="TT" />
// Props: gate (required), app (required), appName?
```

---

## 10. Theme hook

```ts
import { useTheme } from '@proappstore/sdk/hooks';
const { theme, preference, setPreference } = useTheme();
// theme: 'light' | 'dark'
// preference: 'light' | 'dark' | 'system'
```

---

## Primitives NOT used by TT

| Primitive | Reason not used |
|-----------|----------------|
| `app.rooms` | No real-time collaboration; entries are personal |
| `app.storage` | No file uploads |
| `app.maps` | No location data |
| `app.sms` | Not needed |
| `app.email` | Not planned for MVP |
| `app.counters` | `app.db` aggregates are sufficient |
| `app.webhooks` | No external integrations in MVP |
| `app.proxy` | No external API calls |
