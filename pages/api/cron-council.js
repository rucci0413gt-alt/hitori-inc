// pages/api/cron-council.js
import { put } from '@vercel/blob';

export const config = { maxDuration: 120 };

async function callClaude(prompt, useWebSearch = false, maxTokens = 2000) {
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };
  if (useWebSearch) {
    headers['anthropic-beta'] = 'web-search-2025-03-05';
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const noCite = text.replace(/<\/?cite[^>]*>/g, '');
  const clean = noCite.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  return JSON.parse(clean.substring(start, end + 1));
}

export default async function handler(req, res) {
  try {
    const baseUrl = `https://${req.headers.host}`;

    // 会議を実行
    const councilRes = await fetch(`${baseUrl}/api/research-council`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const councilData = await councilRes.json();

    if (!councilData.success) {
      throw new Error('会議の実行に失敗しました');
    }

    // 記事を自動生成
    const articleRes = await fetch(`${baseUrl}/api/execute-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: councilData.execution.searchKeyword,
        genre: councilData.strategy.recommendation,
        reason: councilData.strategy.reason,
      }),
    });
    const articleData = await articleRes.json();

    // Blobに保存
    const today = new Date().toISOString().slice(0, 10);
    const saveData = {
      date: today,
      council: councilData,
      article: articleData.success ? articleData : null,
      generatedAt: new Date().toISOString(),
    };

    await put(`council/${today}.json`, JSON.stringify(saveData), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    });

    return res.status(200).json({
      success: true,
      theme: councilData.theme,
      recommendation: councilData.strategy.recommendation,
      articleGenerated: articleData.success,
      message: '本日の会議・記事生成が完了しました',
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
