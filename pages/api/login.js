// Verifies the dashboard credentials server-side and issues a signed session
// cookie. The password is compared here and never reaches the browser.
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  isAuthConfigured,
  safeEqual,
} from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthConfigured()) {
    return res.status(500).json({
      error:
        'Login is not configured on the server. Add DASH_USER and DASH_PASS to the environment and redeploy.',
    });
  }

  const { username, password } = req.body || {};

  // Evaluate both fields every time so a wrong username and a wrong password
  // are indistinguishable from the outside.
  const userOk = safeEqual(username, process.env.DASH_USER);
  const passOk = safeEqual(password, process.env.DASH_PASS);
  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = await createSessionToken();
  res.setHeader(
    'Set-Cookie',
    [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${SESSION_MAX_AGE_SEC}`,
      // Vercel is always HTTPS; plain `next dev` on localhost is not.
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; '),
  );

  return res.status(200).json({ ok: true });
}
