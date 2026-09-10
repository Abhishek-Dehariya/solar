// Server-side-only proxy for the eSenZ live feed.
//
// SECURITY: the plant KEY lives only in process.env (ESENZ_KEY) and never
// reaches the browser. The upstream feed is fetched here on the server, the
// text/html response is parsed as JSON, and only the cleaned payload is sent
// to the client.
const UPSTREAM_URL = 'https://esenz.co.in/esenzAPIDashboardFromRT.aspx';

export default async function handler(req, res) {
  // Only GET is supported by this endpoint.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.ESENZ_KEY;
  if (!key) {
    return res.status(500).json({
      error: 'ESENZ_KEY is not configured on the server. Add it to .env.local and restart.',
    });
  }

  try {
    const upstreamRes = await fetch(`${UPSTREAM_URL}?KEY=${encodeURIComponent(key)}`, {
      headers: { Accept: 'text/plain, text/html, application/json' },
      // Never cache upstream failures/successes longer than the feed lives.
      cache: 'no-store',
    });

    if (!upstreamRes.ok) {
      return res.status(502).json({
        error: `Upstream eSenZ feed responded with status ${upstreamRes.status}.`,
      });
    }

    // The upstream Content-Type is text/html even though the body is JSON, so
    // read it as text and parse manually rather than calling .json().
    const rawText = await upstreamRes.text();

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (parseErr) {
      return res.status(502).json({ error: 'Upstream eSenZ feed returned invalid JSON.' });
    }

    // Cache the (public, key-stripped) payload for shared caches: serve fresh
    // for 30s, then allow a stale copy for up to 60s while revalidating.
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach the eSenZ upstream feed.' });
  }
}
