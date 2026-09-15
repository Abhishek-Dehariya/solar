/* ---------------------------------------------------------------------------
 * Session helpers for the dashboard login.
 *
 * This module is imported by BOTH middleware.js (Edge runtime) and the
 * pages/api routes (Node runtime), so it sticks to Web Crypto
 * (globalThis.crypto.subtle) and never touches node:crypto.
 *
 * SECURITY: DASH_USER / DASH_PASS live only in process.env — they are compared
 * on the server and never sent to the browser. The client only ever holds an
 * httpOnly cookie carrying a signed expiry, which JavaScript cannot read.
 * ------------------------------------------------------------------------- */

export const SESSION_COOKIE = 'esenz_session';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

// SESSION_SECRET is preferred, but deriving from the credentials keeps the
// deployment to two env vars. Rotating the password then invalidates every
// existing session, which is the behaviour you want anyway.
function signingSecret() {
  return (
    process.env.SESSION_SECRET ||
    `esenz:${process.env.DASH_USER || ''}:${process.env.DASH_PASS || ''}`
  );
}

function base64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64url(new Uint8Array(signature));
}

// Length-independent compare so a near-miss can't be timed out character by
// character.
export function safeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

// Token format: "<expiry-epoch-ms>.<hmac>". Self-contained — no server-side
// session store to keep in sync across serverless invocations.
export async function createSessionToken(ttlSec = SESSION_MAX_AGE_SEC) {
  const expiry = Date.now() + ttlSec * 1000;
  return `${expiry}.${await hmac(String(expiry))}`;
}

export async function verifySessionToken(token) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;

  const expiry = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;

  return safeEqual(signature, await hmac(expiry));
}

// Fail closed: with no credentials configured nobody gets in, and the login
// screen surfaces exactly which env vars are missing.
export function isAuthConfigured() {
  return Boolean(process.env.DASH_USER && process.env.DASH_PASS);
}
