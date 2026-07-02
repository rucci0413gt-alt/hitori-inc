// pages/api/research-council.js
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { topic } = req.body;
  const theme = topic || '夏に需要が高まる商品、この夏流行りそうなもの';

  try {
    const log = [];

    // ① リサーチ担当：Web検索して情報収集
    log.push({ role: 'リサーチ担当', action: 'search', content: `「${theme}」についてWeb検索を開始します。` });

    const researchPrompt = `あなたはリサーチ担当のAI社員です。Web検索を使って「${theme}」について調べてください。

調べたら、以下のJSON形式で報告してください（前後に余分な文字不要）：
{"findings":"調べてわかったことを300文字程度でまとめる","sources":"参考にした情報の種類（例：ニュースサイト、SNSトレンドなど）","keyItems":["具体的な商品/トレンド1","商品/トレンド2","商品/トレンド3"]}`;

    const researchRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
        messages: [{ role: 'user', content: researchPrompt }],
      }),
    });

    const researchData = await researchRes.json();
    const researchText = (researchData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const researchClean = researchText.replace(/```json|```/g, '').trim();
    const rStart = researchClean.indexOf('{');
    const rEnd = researchClean.lastIndexOf('}');
    const research = JSON.parse(researchClean.substring(rStart, rEnd + 1));

    log.push({ role: 'リサーチ担当', action: 'report', content: research.findings });

    // ② 戦略担当：リサーチ結果をもとに戦略を議論
    log.push({ role: '戦略担当', action: 'think', content: 'リサーチ結果をもとに、事業として狙うべき商品を検討します。' });

    const strategyPrompt = `あなたは戦略担当のAI社員です。リサーチ担当から以下の報告を受けました。

【リサーチ結果】
${research.findings}
候補商品：${research.keyItems.join('、')}

これをもとに、アフィリエイト事業として今週注力すべき商品ジャンルを1つ選び、理由と共に提案してください。

JSON形式のみで回答：
{"recommendation":"推奨する商品ジャンル","reason":"選んだ理由200文字","risk":"注意点や懸念100文字"}`;

    const strategyRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: strategyPrompt }],
      }),
    });

    const strategyData = await strategyRes.json();
    const strategyText = (strategyData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const strategyClean = strategyText.replace(/```json|```/g, '').trim();
    const sStart = strategyClean.indexOf('{');
    const sEnd = strategyClean.lastIndexOf('}');
    const strategy = JSON.parse(strategyClean.substring(sStart, sEnd + 1));

    log.push({ role: '戦略担当', action: 'propose', content: `${strategy.recommendation}を推奨します。理由：${strategy.reason}` });

    // ③ レビュー担当：戦略に対して批判的にチェック
    log.push({ role: 'レビュー担当', action: 'think', content: '戦略担当の提案を精査します。' });

    const reviewPrompt = `あなたはレビュー担当のAI社員です。戦略担当から以下の提案を受けました。批判的な視点でチェックしてください。

【提案】
商品ジャンル：${strategy.recommendation}
理由：${strategy.reason}
懸念点：${strategy.risk}

この提案は妥当か、改善点はあるか評価してください。

JSON形式のみで回答：
{"verdict":"承認 または 要修正","comment":"評価コメント150文字"}`;

    const reviewRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: reviewPrompt }],
      }),
    });

    const reviewData = await reviewRes.json();
    const reviewText = (reviewData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const reviewClean = reviewText.replace(/```json|```/g, '').trim();
    const rvStart = reviewClean.indexOf('{');
    const rvEnd = reviewClean.lastIndexOf('}');
    const review = JSON.parse(reviewClean.substring(rvStart, rvEnd + 1));

    log.push({ role: 'レビュー担当', action: 'verdict', content: `${review.verdict}：${review.comment}` });

    return res.status(200).json({
      success: true,
      theme,
      research,
      strategy,
      review,
      log,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    return res.status(500).json({ error: 'サーバーエラー', message: error.message });
  }
}
