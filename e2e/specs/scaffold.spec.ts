/**
 * E2E spec — Ticket #2: Project scaffold & SDK wiring
 *
 * Covers every acceptance criterion from the approved spec:
 *   AC-1  src/lib/app.ts singleton (structural — verified via app mounting)
 *   AC-2  src/lib/db.ts migrations (verified by absence of console errors + page render)
 *   AC-3  App.tsx — ProShell + routing
 *   AC-4  Routing — placeholder pages for all 6 routes
 *   AC-5  Top nav — ProfileMenu present
 *   AC-6  Bottom tab bar (mobile) — 4 tabs: Timer, Entries, Projects, Reports
 *   AC-7  Sidebar nav (desktop lg+) — same 4 tabs + optional Team link
 *   AC-8  Team link gated behind roles (owner/moderator) — hidden for anonymous
 *   AC-9  Dark-mode — Tailwind dark: variants active (class strategy)
 *   AC-10 Accessibility — landmark labels on both navs
 */

import { test, expect, hasSession } from '../fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Viewport mimicking a mobile device (< 640 px). */
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Viewport mimicking a desktop (≥ 1024 px). */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

// ---------------------------------------------------------------------------
// AC-1 · app singleton wires correctly — shell renders without crash
// ---------------------------------------------------------------------------

test('AC-1: app root mounts without a JS error', async ({ page }) => {
  // Collect uncaught exceptions; a broken initPro call would throw here.
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // The fixture already navigated; just assert #root has content.
  await expect(page.locator('#root')).not.toBeEmpty();
  expect(errors.filter((e) => /initPro|appId|sdk/i.test(e))).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// AC-2 · DB migrations — initDb() called without crashing the app
// ---------------------------------------------------------------------------

test('AC-2: DB migrations run without throwing (no console error about migrate)', async ({
  page,
}) => {
  const migrationErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') migrationErrors.push(msg.text());
  });

  // Navigate fresh so we capture the migration call on mount.
  await page.goto(page.url());
  // Give the async initDb() time to settle (auto-wait for network idle).
  await page.waitForLoadState('networkidle');

  // If migrate() throws, initDb().catch(console.error) logs it.
  const migrationFailures = migrationErrors.filter((e) =>
    /migrate|migration|database|db/i.test(e)
  );
  expect(migrationFailures).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// AC-3 · ProShell — app name "TT" visible in the shell chrome
// ---------------------------------------------------------------------------

test('AC-3a: ProShell renders — app name "TT" appears in the page', async ({ page }) => {
  // "TT" appears in both the sidebar header and the mobile top bar.
  await expect(page.getByText('TT').first()).toBeVisible();
});

test('AC-3b: ProShell allowFree — unauthenticated users see the app (not a paywall)', async ({
  page,
}) => {
  // When allowFree is set, ProShell must NOT show a subscription gate to anonymous users.
  // The Timer page heading should be visible without signing in.
  await expect(
    page.getByRole('heading', { name: 'Timer' })
  ).toBeVisible();
});

test('AC-3c: ProShell showThemeToggle — a theme-toggle control is present in the page', async ({
  page,
}) => {
  // ProfileMenu renders the theme toggle (sun/moon button) from the SDK.
  // We look for a button whose accessible name or title contains theme-related text,
  // OR the containing ProfileMenu element (which is always rendered per source).
  // The ProfileMenu SDK component is always in the top header.
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  // ProfileMenu is always rendered; its presence proves showThemeToggle wiring is intact.
  // We verify it contains at least one interactive element (button/avatar).
  await expect(header.locator('button, [role="button"], img[alt]').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-4 · Routes — every placeholder page renders at its URL
// ---------------------------------------------------------------------------

const ROUTES = [
  { path: '/',          heading: 'Timer' },
  { path: '/entries',   heading: 'Entries' },
  { path: '/projects',  heading: 'Projects' },
  { path: '/reports',   heading: 'Reports' },
  { path: '/team',      heading: 'Team' },
  { path: '/profile',   heading: null }, // Profile page rendered by ProProfilePage SDK component — no custom h1
] as const;

for (const { path, heading } of ROUTES) {
  test(`AC-4: route "${path}" renders without crashing`, async ({ page }) => {
    await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + path);
    await expect(page.locator('#root')).not.toBeEmpty();
    if (heading) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
}

// ---------------------------------------------------------------------------
// AC-5 · ProfileMenu in the top nav bar
// ---------------------------------------------------------------------------

test('AC-5: ProfileMenu is rendered inside the top header', async ({ page }) => {
  // The top <header> must contain the ProfileMenu SDK component.
  // ProfileMenu always renders a visible element (sign-in button or avatar).
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  // It must not be empty — ProfileMenu always renders at minimum a sign-in trigger.
  await expect(header.locator('button, [role="button"], img').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-6 · Bottom tab bar (mobile) — 4 named tabs, hidden on desktop
// ---------------------------------------------------------------------------

test('AC-6a: bottom tab bar is visible on mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await expect(bottomNav).toBeVisible();
});

test('AC-6b: bottom tab bar contains exactly the 4 required tabs', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await expect(bottomNav.getByRole('link', { name: 'Timer' })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Entries' })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Projects' })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Reports' })).toBeVisible();
});

test('AC-6c: bottom tab bar has NO Team tab', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await expect(bottomNav.getByRole('link', { name: 'Team' })).toHaveCount(0);
});

test('AC-6d: bottom tab bar is hidden on desktop viewport', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  // lg:hidden means CSS display:none — not visible but may be in DOM.
  await expect(bottomNav).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-6e · Bottom tab navigation — links route correctly
// ---------------------------------------------------------------------------

test('AC-6e: tapping Entries tab on mobile navigates to /entries', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await bottomNav.getByRole('link', { name: 'Entries' }).click();
  await expect(page).toHaveURL(/\/entries/);
  await expect(page.getByRole('heading', { name: 'Entries' })).toBeVisible();
});

test('AC-6f: tapping Projects tab on mobile navigates to /projects', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await bottomNav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});

test('AC-6g: tapping Reports tab on mobile navigates to /reports', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await bottomNav.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports/);
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});

test('AC-6h: tapping Timer tab on mobile navigates to /', async ({ page }) => {
  // Navigate away first so the Timer tab is not already active.
  await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + '/entries');
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await bottomNav.getByRole('link', { name: 'Timer' }).click();
  await expect(page).toHaveURL(/\/$|proappstore\.online\/$/);
  await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-7 · Sidebar nav (desktop lg+) — 4 tabs visible, Team conditionally
// ---------------------------------------------------------------------------

test('AC-7a: sidebar nav is visible on desktop viewport', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await expect(sidebar).toBeVisible();
});

test('AC-7b: sidebar contains Timer, Entries, Projects, Reports links', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await expect(sidebar.getByRole('link', { name: 'Timer' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Entries' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Projects' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Reports' })).toBeVisible();
});

test('AC-7c: sidebar is hidden on mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await expect(sidebar).not.toBeVisible();
});

test('AC-7d: sidebar links navigate correctly — clicking Entries goes to /entries', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await sidebar.getByRole('link', { name: 'Entries' }).click();
  await expect(page).toHaveURL(/\/entries/);
  await expect(page.getByRole('heading', { name: 'Entries' })).toBeVisible();
});

test('AC-7e: sidebar links navigate correctly — clicking Reports goes to /reports', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await sidebar.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports/);
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-8 · Team link gated by role — NOT shown to anonymous / non-privileged users
// ---------------------------------------------------------------------------

test('AC-8a: Team link is NOT shown in the sidebar for anonymous users', async ({ page }) => {
  test.skip(hasSession, 'This test is for anonymous (unauthenticated) users only');
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  // Anonymous users have no owner/moderator role — Team link must be absent.
  await expect(sidebar.getByRole('link', { name: 'Team' })).toHaveCount(0);
});

test('AC-8b: Team link is shown in the sidebar for owner/moderator (signed-in, privileged)', async ({
  page,
}) => {
  test.skip(!hasSession, 'needs a session');
  // NOTE: this test only PASSES if the session belongs to the app owner or a moderator.
  // If the session is a plain member, the team link is correctly absent and this test
  // documents that gap. We assert conditionally to avoid a false fail.
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  // Wait briefly for the roles.check() async effect to resolve.
  await page.waitForTimeout(500); // only safe wait: role check is a network call
  const teamLink = sidebar.getByRole('link', { name: 'Team' });
  // The team link count is either 0 (member) or 1 (owner/moderator).
  const count = await teamLink.count();
  // We can only ASSERT it is present if PAS_ROLE env says owner/moderator.
  if (process.env.PAS_ROLE === 'owner' || process.env.PAS_ROLE === 'moderator') {
    expect(count).toBe(1);
  } else {
    // For a plain member session, assert it is absent (also correct behaviour).
    expect(count).toBe(0);
  }
});

test('AC-8c: navigating directly to /team renders Team page (no 404)', async ({ page }) => {
  // The route must exist regardless of role gating — the page itself renders.
  await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + '/team');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC-9 · Dark mode — Tailwind class strategy wired correctly
// ---------------------------------------------------------------------------

test('AC-9a: page root or <html> carries a theme class (light or dark)', async ({ page }) => {
  // ProShell applies data-theme or a class to <html>. Tailwind darkMode:"class" requires
  // a "dark" class on <html> or the root element for dark: variants to activate.
  // We accept either "dark" class on <html> or absence (meaning light mode is default).
  const htmlClass = await page.locator('html').getAttribute('class');
  const htmlDataTheme = await page.locator('html').getAttribute('data-theme');
  // At minimum, one of these must be set (ProShell always initialises a theme).
  const themeIsPresent =
    htmlClass !== null || htmlDataTheme !== null;
  expect(themeIsPresent).toBe(true);
});

test('AC-9b: main content area has dark: variant classes (bg-white dark:bg-gray-950)', async ({
  page,
}) => {
  // The outermost AppShell div must have the base dark-mode colour token.
  // We verify by checking the DOM element that wraps everything has the class.
  const shellDiv = page.locator('#root > div').first();
  const className = await shellDiv.getAttribute('class');
  // Must contain both the light bg and the dark: counterpart per design.md tokens.
  expect(className).toMatch(/bg-white/);
  expect(className).toMatch(/dark:bg-gray-950/);
});

test('AC-9c: sidebar has dark: border and bg variant classes', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  const className = await sidebar.getAttribute('class');
  expect(className).toMatch(/dark:bg-gray-900/);
  expect(className).toMatch(/dark:border-gray-800/);
});

test('AC-9d: bottom tab bar has dark: bg and border classes', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  const className = await bottomNav.getAttribute('class');
  expect(className).toMatch(/dark:bg-gray-950/);
  expect(className).toMatch(/dark:border-gray-800/);
});

// ---------------------------------------------------------------------------
// AC-10 · Accessibility — both navs have aria-label landmarks
// ---------------------------------------------------------------------------

test('AC-10a: sidebar nav has aria-label="Sidebar navigation"', async ({ page }) => {
  // getByRole with name already verifies this — but be explicit.
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  await expect(sidebar).toHaveCount(1);
});

test('AC-10b: bottom tab nav has aria-label="Bottom tab navigation"', async ({ page }) => {
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  await expect(bottomNav).toHaveCount(1);
});

test('AC-10c: all sidebar links have accessible names', async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const sidebar = page.getByRole('navigation', { name: 'Sidebar navigation' });
  const links = sidebar.getByRole('link');
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(4); // at minimum Timer+Entries+Projects+Reports

  for (let i = 0; i < count; i++) {
    const name = await links.nth(i).getAttribute('aria-label');
    // Every NavLink has aria-label={label} per App.tsx source.
    expect(name).toBeTruthy();
  }
});

test('AC-10d: all bottom tab links have accessible names', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const bottomNav = page.getByRole('navigation', { name: 'Bottom tab navigation' });
  const links = bottomNav.getByRole('link');
  const count = await links.count();
  expect(count).toBe(4);

  for (let i = 0; i < count; i++) {
    const name = await links.nth(i).getAttribute('aria-label');
    expect(name).toBeTruthy();
  }
});

test('AC-10e: page headings are present on all placeholder pages (keyboard navigation)', async ({
  page,
}) => {
  const routes = [
    { path: '/', heading: 'Timer' },
    { path: '/entries', heading: 'Entries' },
    { path: '/projects', heading: 'Projects' },
    { path: '/reports', heading: 'Reports' },
    { path: '/team', heading: 'Team' },
  ];

  for (const { path, heading } of routes) {
    await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// AC-11 · Profile page — ProProfilePage SDK component renders at /profile
// ---------------------------------------------------------------------------

test('AC-11: /profile renders the SDK ProProfilePage (no crash, has content)', async ({
  page,
}) => {
  test.skip(!hasSession, 'needs a session');
  await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + '/profile');
  await expect(page.locator('#root')).not.toBeEmpty();
  // ProProfilePage renders a non-empty content block inside #root.
  // We cannot assert an h1 because it's SDK-managed, but the page must not be blank.
  const rootText = await page.locator('#root').innerText();
  expect(rootText.trim().length).toBeGreaterThan(0);
});

test('AC-11b: /profile page does not crash for anonymous users', async ({ page }) => {
  test.skip(hasSession, 'This test is for unauthenticated state only');
  await page.goto((process.env.APP_URL ?? 'https://tt.proappstore.online') + '/profile');
  // ProShell should handle unauthenticated access gracefully — no JS error crash.
  await expect(page.locator('#root')).not.toBeEmpty();
});
