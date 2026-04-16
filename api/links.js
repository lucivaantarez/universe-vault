import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // RECEIVE LINKS (POST)
  if (req.method === 'POST') {
    const { gameId, linkCode, fullUrl } = req.body;
    
    // Key-value storage in Upstash Redis
    // Links auto-expire after 24 hours to keep your stock fresh
    await redis.set(`link:${linkCode}`, JSON.stringify({
      gameId: gameId || 'Sailor Piece',
      linkCode,
      fullUrl,
      status: 'active',
      addedAt: new Date().toISOString()
    }), { ex: 86400 });

    return res.status(200).json({ success: true });
  }

  // DISPLAY LINKS (GET)
  if (req.method === 'GET') {
    const keys = await redis.keys('link:*');
    if (keys.length === 0) return res.status(200).json([]);

    const data = await redis.mget(...keys);
    const links = data
      .map(item => (typeof item === 'string' ? JSON.parse(item) : item))
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    return res.status(200).json(links);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
