/**
 * TT — shared Playwright fixtures.
 *
 * The harness boots a Page already navigated to the app root.
 * If the platform has injected a test-session cookie, `hasSession` is true
 * and tests can assert on authenticated UI.
 */

import { test as base, expect, type Page } from '@playwright/test';

/** True when the environment provides a signed-in session cookie. */
export const hasSession = !!process.env.PAS_SESSION;

type Fixtures = { page: Page };

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    // Inject session cookie if available
    if (process.env.PAS_SESSION) {
      await page.context().addCookies([
        {
          name: 'pas_session',
          value: process.env.PAS_SESSION,
          domain: process.env.APP_HOST ?? 'tt.proappstore.online',
          path: '/',
        },
      ]);
    }
    await page.goto(process.env.APP_URL ?? 'https://tt.proappstore.online');
    // Wait for the React root to mount
    await page.locator('#root').waitFor({ state: 'attached' });
    await use(page);
  },
});

export { expect };
