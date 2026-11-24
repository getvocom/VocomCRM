'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/app/actions';
import { GlobalSearch } from '@/components/global-search';
import { NAV_GROUPS } from '@/lib/nav-items';
import { NotificationBell } from '@/components/notification-bell';

function Brand() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">
        V
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-sm font-semibold text-ink">Vocom CRM</span>
        <span className="text-xs text-ink-2">Sales workspace</span>
      </span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV_GROUPS.map((group, i) => (
        <div key={group.label ?? i}>
          {group.label && <p className="px-2.5 pb-1.5 pt-4 text-xs font-medium text-ink-2">{group.label}</p>}
          <div className="space-y-px">
            {group.links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center rounded-lg px-2.5 py-[7px] text-sm transition-colors ${
                    active
                      ? 'bg-panel font-medium text-ink shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgba(0,0,0,0.04)]'
                      : 'text-ink-3 hover:bg-divider hover:text-ink'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  const signOutButton = (
    <button
      onClick={handleSignOut}
      className="block w-full rounded-lg px-2.5 py-[7px] text-left text-sm text-ink-2 hover:bg-divider hover:text-ink"
    >
      Sign out
    </button>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between gap-2 border-b border-line bg-page px-4 py-3 md:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-divider"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav aria-label="Main" className="border-b border-line bg-page px-3 pb-3 pt-2 md:hidden">
          <GlobalSearch onNavigate={() => setMenuOpen(false)} />
          <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          <div className="mt-3 border-t border-line pt-2">{signOutButton}</div>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col md:border-r md:border-line md:bg-page">
        <div className="flex items-center justify-between gap-2 px-[22px] pb-3.5 pt-6">
          <Brand />
          <NotificationBell align="left" />
        </div>
        <div className="px-3">
          <GlobalSearch shortcut />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-line px-3 py-3">{signOutButton}</div>
      </aside>
    </>
  );
}
