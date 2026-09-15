import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth';

/* ---------------------------------------------------------------------------
 * Gate every page and API route behind the session cookie.
 *
 * Because this runs before the page renders, an unauthenticated visitor never
 * receives the dashboard HTML or a single byte of plant data — "view source"
 * and DevTools have nothing to show.
 * ------------------------------------------------------------------------- */

export const config = {
  // Everything except the login screen, its endpoints, and Next's own assets.
  matcher: ['/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico).*)'],
};

export default async function middleware(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  // The dashboard polls /api/esenz-live in the background: answer those with a
  // JSON 401 so the client can react, and redirect real page loads instead.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (req.nextUrl.pathname !== '/') {
    url.searchParams.set('from', req.nextUrl.pathname);
  }
  return NextResponse.redirect(url);
}
