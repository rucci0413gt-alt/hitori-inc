// pages/api/feedback.js
import { put, list } from '@vercel/blob';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { genre, articleTitle, likes, impressions, replies, memo } = req.body;

    try {
      const id = Date.now().toString();
      const data = {
        id,
        genre,
        articleTitle,
        likes: Number(likes) || 0,
        impressions: Number(impressions) || 0,
        replies: Number(replies) || 0,
        memo: memo || '',
        savedAt: new Date().toISOString(),
      };

      await put(`feedback/${id}.json`, JSON.stringify(data), {
        access: 'public',
        contentType: 'application/json',
      });

      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: '保存失敗', message: e.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'feedback/' });
      const items = await Promise.all(
        blobs.map(async (b) => {
          const r = await fetch(b.url);
          return r.json();
        })
      );
      items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      return res.status(200).json({ success: true, items });
    } catch (e) {
      return res.status(500).json({ error: '取得失敗', message: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
