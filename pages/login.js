import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Icon } from '../components/common';
import { useTheme } from '../lib/theme';

/* ---------------------------------------------------------------------------
 * Sign-in screen. Mirrors the dashboard's card language: surface panel on the
 * bg wash, edge border, shadow-tile, display font for the heading, and the
 * same power-teal primary action.
 * ------------------------------------------------------------------------- */

// Where "Request access" goes. Country code, no +/spaces — wa.me's format.
const WHATSAPP_NUMBER = '919806610010';
const WHATSAPP_MESSAGE = 'Hi, please share the Solar Dashboard password.';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

// `?from=` is attacker-controllable, so only same-origin absolute paths are
// honoured ("//evil.com" starts with a slash too).
function safeRedirect(from) {
  return typeof from === 'string' && /^\/(?!\/)/.test(from) ? from : '/';
}

// Filled brand glyph — the shared <Icon> set is stroke-only, so this one lives
// here rather than being forced into that shape.
function WhatsAppGlyph({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.19 8.19 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

const FIELD_CLASS =
  'w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-dim focus:border-power/60 focus:ring-2 focus:ring-power/20';

export default function Login() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      let body = {};
      try {
        body = await res.json();
      } catch (_) {
        /* fall back to the status-code message below */
      }
      if (!res.ok) {
        setError(body.error || `Sign-in failed (HTTP ${res.status}).`);
        setBusy(false);
        return;
      }
      // replace() so the back button doesn't return to the login screen.
      router.replace(safeRedirect(router.query.from));
    } catch (_) {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · Solar Dashboard</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-power/80" aria-hidden="true" />
                <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Solar Dashboard
                </h1>
              </div>
              <p className="mt-0.5 text-xs text-muted">Sign in to view live plant data</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to day mode (light)' : 'Switch to night mode (dark)'}
              aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-surface-2 text-muted transition-colors hover:border-power/60 hover:text-ink"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-edge bg-surface p-6 shadow-tile"
          >
            <div className="mb-4">
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-muted">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={FIELD_CLASS}
                placeholder="operator"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD_CLASS}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical"
              >
                <Icon name="alert" className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-power px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-power/85 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="mt-5 border-t border-edge-soft pt-4">
              <p className="mb-2 text-center text-[11px] text-dim">Don&apos;t have the password?</p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-edge bg-surface-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-power/60 hover:text-ink"
              >
                <WhatsAppGlyph className="h-4 w-4 text-[#25D366]" />
                Request access on WhatsApp
              </a>
            </div>
          </form>

          <p className="mt-4 text-center text-[11px] text-dim">
            Sessions stay signed in for 12 hours.
          </p>
        </div>
      </div>
    </>
  );
}
