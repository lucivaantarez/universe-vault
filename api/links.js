import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // POST: When a cloud device reports a new link
  if (req.method === 'POST') {
    const { gameId, linkCode, fullUrl } = req.body;
    const key = `link:${linkCode}`;
    
    await redis.set(key, JSON.stringify({
      gameId,
      linkCode,
      fullUrl,
      status: 'active',
      addedAt: new Date().toISOString()
    }), { ex: 86400 }); // Auto-delete after 24 hours to keep stock fresh
    
    return res.status(200).json({ success: true });
  }

  // GET: When your tablet dashboard loads the list
  if (req.method === 'GET') {
    const keys = await redis.keys('link:*');
    if (keys.length === 0) return res.status(200).json([]);

    const data = await redis.mget(...keys);
    // Sort so newest links appear first on your MatePad
    const links = data.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    
    return res.status(200).json(links);
  }
}
