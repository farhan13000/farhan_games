import { ShieldCheck } from 'lucide-react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { config } from '../../lib/config';
import { Toaster } from '../common/Toaster';
import { Header } from './Header';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {config.appName}. Made for friendly rivalries.
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Server-authoritative ·
            Real-time · Private rooms
          </p>
        </div>
      </footer>
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
