// Clears the session cookie. Nothing server-side to tear down — the token is
// self-contained, so expiring the cookie is the whole logout.
import { SESSION_COOKIE } from '../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return res.status(200).json({ ok: true });
}
