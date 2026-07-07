// pages/api/execute-article.js
export const config = { maxDuration: 60 };

const generateMyLink = (url) => {
  const encoded = encodeURIComponent(url);
  return `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3771004&pid=892616093&vc_url=${encoded}`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { keyword, genre, reason } = req.body;

  try {
    const simpleKeyword = keyword.split(/[,、\s]+/)[0];

    const yahooRes = await fetch(
      `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?` +
      new URLSearchParams({
        appid: process.env.YAHOO_APP_ID,
        query: simpleKeyword,
        results: 5,
        sort: '-score',
      })
    );

    if (!yahooRes.ok) {
      return res.status(500).json({ error: 'Yahoo!API失敗', status: yahooRes.status });
    }

    const yahooData = await yahooRes.json();
    const items = (yahooData.hits || []).map(item => ({
      name: item.name,
      price: item.price,
      url: item.url,
      mylink: generateMyLink(item.url),
      image: item.exImage?.url || item.image?.medium || item.image?.small || '',
      review: item.review?.rate || 0,
      reviewCount: item.review?.count || 0,
    }));

    if (items.length === 0) {
      return res.status(400).json({ error: '商品が見つかりませんでした', keyword: simpleKeyword });
    }

    const productList = items.map((item, i) =>
      `${i + 1}. ${item.name} - ¥${item.price.toLocaleString()} (レビュー:${item.review}点 ${item.reviewCount}件)`
    ).join('\n');

    const prompt = `以下の商品リストをもとに、「${genre}」ジャンルのレビュー記事とX投稿文をJSON形式で作成してください。
このジャンルはAI社員による会議で「${reason}」という理由で選ばれました。

商品リスト：
${productList}

ルール：
・友達に話すような自然な口調
・体験談風（「実際に使うと」「やっぱ」など）
・押しつけがましくない
・X投稿文は140文字以内、ハッシュタグ2〜3個含む
・JSONのみ出力・前後に余分な文字不要

{"title":"タイトル30文字以内","intro":"リード文150文字","reviews":[{"rank":1,"headline":"魅力20文字","description":"特徴150文字","recommendFor":"対象30文字","xPost":"X投稿文140文字以内"},{"rank":2,"headline":"魅力20文字","description":"特徴150文字","recommendFor":"対象30文字","xPost":"X投稿文140文字以内"},{"rank":3,"headline":"魅力20文字","description":"特徴150文字","recommendFor":"対象30文字","xPost":"X投稿文140文字以内"}],"conclusion":"まとめ100文字"}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const rawText = (claudeData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    const article = JSON.parse(cleanText.substring(startIdx, endIdx + 1));

    return res.status(200).json({
      success: true,
      article,
      items,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    return res.status(500).json({ error: 'サーバーエラー', message: error.message });
  }
}

