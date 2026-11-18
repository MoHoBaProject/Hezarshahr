let cached = { n: null, t: 0 };
const TTL = 10 * 60 * 1000;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api/followers') return env.ASSETS.fetch(request);

    const now = Date.now();
    if (cached.n === null || now - cached.t > TTL) {
      try {
        const r = await fetch(
          'https://graph.instagram.com/v26.0/me?fields=followers_count&access_token=' + env.IG_TOKEN
        );
        const d = await r.json();
        if (typeof d.followers_count === 'number') cached = { n: d.followers_count, t: now };
      } catch (e) {}
    }

    return new Response(JSON.stringify({ n: cached.n }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' },
    });
  },
};
