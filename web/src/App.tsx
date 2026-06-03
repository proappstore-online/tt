import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ProShell } from '@proappstore/sdk/shell';
import { ProfileMenu } from '@proappstore/sdk/ui';
import { app } from './lib/app';
import { initDb } from './lib/db';
import Timer from './pages/Timer';
import Entries from './pages/Entries';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Team from './pages/Team';
import Profile from './pages/Profile';

// Runs DB migrations once on mount
function DbInit() {
  useEffect(() => {
    initDb().catch(console.error);
  }, []);
  return null;
}

const NAV_TABS = [
  { to: '/',         label: 'Timer',    icon: '⏱' },
  { to: '/entries',  label: 'Entries',  icon: '📋' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/reports',  label: 'Reports',  icon: '📊' },
] as const;

function AppShell() {
  const [canSeeTeam, setCanSeeTeam] = useState(false);

  useEffect(() => {
    app.roles
      .check('owner')
      .then((isOwner) => {
        if (isOwner) {
          setCanSeeTeam(true);
          return false; // skip moderator check
        }
        return app.roles.check('moderator');
      })
      .then((isMod) => {
        if (isMod) setCanSeeTeam(true);
      })
      .catch(() => {/* not signed in yet */});
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* ── Sidebar nav (lg+) ─────────────────────────────── */}
      <nav
        aria-label="Sidebar navigation"
        className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
      >
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-50">TT</span>
        </div>
        <ul className="flex-1 py-4 space-y-1 px-2">
          {NAV_TABS.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                aria-label={label}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ].join(' ')
                }
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
          {canSeeTeam && (
            <li>
              <NavLink
                to="/team"
                aria-label="Team"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ].join(' ')
                }
              >
                <span aria-hidden="true">👥</span>
                Team
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* ── Main column ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top nav bar */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
          <span className="lg:hidden text-lg font-bold text-gray-900 dark:text-gray-50">TT</span>
          <div className="ml-auto">
            <ProfileMenu app={app} showThemeToggle showBilling />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Routes>
            <Route path="/"         element={<Timer />} />
            <Route path="/entries"  element={<Entries />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/reports"  element={<Reports />} />
            <Route path="/team"     element={<Team />} />
            <Route path="/profile"  element={<Profile />} />
          </Routes>
        </div>
      </div>

      {/* ── Bottom tab bar (mobile, hidden lg+) ───────────── */}
      <nav
        aria-label="Bottom tab navigation"
        className="fixed bottom-0 left-0 right-0 lg:hidden flex border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 z-10"
      >
        {NAV_TABS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={label}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')
            }
          >
            <span className="text-lg" aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ProShell app={app} appName="TT" allowFree showThemeToggle>
      <BrowserRouter>
        <DbInit />
        <AppShell />
      </BrowserRouter>
    </ProShell>
  );
}
