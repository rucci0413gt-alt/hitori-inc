// pages/api/research-council.js
export const config = { maxDuration: 90 };

async function callClaude(prompt, useWebSearch = false) {
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
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
  const clean = text.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  return JSON.parse(clean.substring(start, end + 1));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { topic } = req.body;
  const theme = topic || '夏に需要が高まる商品、この夏流行りそうなもの';

  try {
    const log = [];

    // ① リサーチ
    log.push({ role: 'リサーチ担当', action: 'search', content: `「${theme}」についてWeb検索を開始します。` });

    const research = await callClaude(
      `あなたはリサーチ担当のAI社員です。Web検索を使って「${theme}」について調べてください。
JSON形式のみで報告：
{"findings":"調べてわかったことを300文字程度でまとめる","keyItems":["商品/トレンド1","商品/トレンド2","商品/トレンド3"]}`,
      true
    );
    log.push({ role: 'リサーチ担当', action: 'report', content: research.findings });

    // ② 戦略〜レビューのループ（最大3回）
    let strategy = null;
    let review = null;
    let previousFeedback = '';
    const MAX_ROUNDS = 3;
    let round = 0;
    let approved = false;

    while (round < MAX_ROUNDS && !approved) {
      round++;

      const strategyPrompt = previousFeedback
        ? `あなたは戦略担当のAI社員です。前回の提案がレビュー担当から差し戻されました。

【リサーチ結果】
${research.findings}
候補：${research.keyItems.join('、')}

【前回の提案】
${strategy.recommendation}：${strategy.reason}

【レビュー担当からの指摘】
${previousFeedback}

指摘を踏まえて改善した提案を出してください。
JSON形式のみで回答：
{"recommendation":"推奨する商品ジャンル","reason":"理由200文字（指摘への対応を含む）","risk":"注意点100文字"}`
        : `あなたは戦略担当のAI社員です。リサーチ結果をもとに、アフィリエイト事業として今週注力すべき商品ジャンルを1つ選び提案してください。

【リサーチ結果】
${research.findings}
候補：${research.keyItems.join('、')}

JSON形式のみで回答：
{"recommendation":"推奨する商品ジャンル","reason":"理由200文字","risk":"注意点100文字"}`;

      strategy = await callClaude(strategyPrompt);
      log.push({
        role: '戦略担当',
        action: round === 1 ? 'propose' : 'revise',
        content: `【第${round}案】${strategy.recommendation}を推奨。理由：${strategy.reason}`,
      });

      const reviewPrompt = `あなたはレビュー担当のAI社員です。厳しく、しかし建設的にチェックしてください。

【提案（第${round}案）】
商品ジャンル：${strategy.recommendation}
理由：${strategy.reason}
懸念点：${strategy.risk}

これは最大${MAX_ROUNDS}回のレビューのうち${round}回目です。妥当なら承認してください。まだ弱ければ要修正とし、具体的にどこを直すべきか指摘してください。

JSON形式のみで回答：
{"verdict":"承認 または 要修正","comment":"評価コメント150文字"}`;

      review = await callClaude(reviewPrompt);
      log.push({ role: 'レビュー担当', action: 'verdict', content: `【第${round}回】${review.verdict}：${review.comment}` });

      if (review.verdict.includes('承認')) {
        approved = true;
      } else {
        previousFeedback = review.comment;
      }
    }

    // ③ 最終結論の確定
    const finalStatus = approved ? '正式承認' : `${MAX_ROUNDS}回検討の末の暫定採用`;
    log.push({
      role: '会議',
      action: 'conclude',
      content: approved
        ? `${round}回の議論を経て「${strategy.recommendation}」が正式承認されました。`
        : `${MAX_ROUNDS}回検討しましたが完全合意には至らず、現時点での最善案「${strategy.recommendation}」を暫定採用します。`,
    });

    return res.status(200).json({
      success: true,
      theme,
      research,
      strategy,
      review,
      rounds: round,
      approved,
      finalStatus,
      log,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    return res.status(500).json({ error: 'サーバーエラー', message: error.message });
  }
}
