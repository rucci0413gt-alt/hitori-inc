// pages/api/research-council.js
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { topic } = req.body;
  const theme = topic || '夏に需要が高まる商品、この夏流行りそうなもの';

  try {
    const log = [];

    // ⓪ 過去のフィードバックを取得
    let feedbackSummary = '過去の投稿実績データはまだありません。';
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: 'feedback/' });
      if (blobs.length > 0) {
        const items = await Promise.all(
          blobs.map(async (b) => {
            const r = await fetch(b.url);
            return r.json();
          })
        );
        feedbackSummary = items.map(d =>
          `${d.genre}｜いいね${d.likes}・インプレッション${d.impressions}${d.memo ? `｜${d.memo}` : ''}`
        ).join('\n');
      }
    } catch (e) {}

    // ① リサーチ
    log.push({ role: 'リサーチ担当', action: 'search', content: `「${theme}」についてWeb検索を開始します。` });

    const research = await callClaude(
      `あなたはリサーチ担当のAI社員です。Web検索を使って「${theme}」について調べてください。

【過去の投稿実績（参考）】
${feedbackSummary}

JSON形式のみで報告：
{"findings":"調べてわかったことを300文字程度でまとめる","keyItems":["商品/トレンド1","商品/トレンド2","商品/トレンド3"]}`,
      true
    );
    log.push({ role: 'リサーチ担当', action: 'report', content: research.findings });

    // ② 勝利条件の定義
    log.push({ role: '戦略担当', action: 'think', content: '本文を作る前に、このテーマにおける「勝利条件」を定義します。' });

    const winCondition = await callClaude(
      `あなたは戦略担当のAI社員です。以下のリサーチ結果をもとに、商品ジャンルを選ぶ前に「何をもって成功と言えるか」を定義してください。

【リサーチ結果】
${research.findings}
候補：${research.keyItems.join('、')}

【過去の投稿実績】
${feedbackSummary}

JSON形式のみで回答：
{"winCondition":"この事業判断における勝利条件を100文字で","avoidTraps":"陥ってはいけない罠や安易な結論を100文字で"}`
    );
    log.push({ role: '戦略担当', action: 'winCondition', content: `勝利条件：${winCondition.winCondition}／避けるべき罠：${winCondition.avoidTraps}` });

    // ③ 3案生成
    log.push({ role: '戦略担当', action: 'think', content: '3つの方向性を出して比較します。' });

    const threeOptions = await callClaude(
      `あなたは戦略担当のAI社員です。以下の情報から、商品ジャンルの案を3つ出してください。

【リサーチ結果】
${research.findings}
候補：${research.keyItems.join('、')}

【勝利条件】
${winCondition.winCondition}

【過去の投稿実績】
${feedbackSummary}

A案：一番手堅い案　B案：一番尖った案　C案：一番差別化できる案
それぞれ理由も添えてください。過去の実績データがあれば、それも判断材料にしてください。安易に平均を取らず、最も伸びる可能性がある案を選定してください。

JSON形式のみで回答：
{"optionA":"案A","optionB":"案B","optionC":"案C","selected":"最終的に採用する案","reason":"選定理由200文字","risk":"注意点100文字"}`,
      false, 2500
    );
    log.push({
      role: '戦略担当',
      action: 'propose',
      content: `A案：${threeOptions.optionA}／B案：${threeOptions.optionB}／C案：${threeOptions.optionC}\n→ 採用：${threeOptions.selected}（${threeOptions.reason}）`,
    });

    // ④ 戦略〜レビューのループ（最大3回）
    let strategy = { recommendation: threeOptions.selected, reason: threeOptions.reason, risk: threeOptions.risk };
    let review = null;
    let previousFeedback = '';
    const MAX_ROUNDS = 3;
    let round = 0;
    let approved = false;

    while (round < MAX_ROUNDS && !approved) {
      round++;

      if (previousFeedback) {
        strategy = await callClaude(
          `あなたは戦略担当のAI社員です。前回の提案がレビュー担当から差し戻されました。

【リサーチ結果】
${research.findings}

【前回の提案】
${strategy.recommendation}：${strategy.reason}

【レビュー担当からの指摘】
${previousFeedback}

指摘を踏まえて改善した提案を出してください。
JSON形式のみで回答：
{"recommendation":"推奨する商品ジャンル","reason":"理由200文字（指摘への対応を含む）","risk":"注意点100文字"}`
        );
        log.push({ role: '戦略担当', action: 'revise', content: `【第${round}案】${strategy.recommendation}を推奨。理由：${strategy.reason}` });
      }

      review = await callClaude(
        `あなたはレビュー担当のAI社員です。厳しく、しかし建設的にチェックしてください。褒めるのではなく、壊すつもりで見てください。

【提案（第${round}回）】
商品ジャンル：${strategy.recommendation}
理由：${strategy.reason}
懸念点：${strategy.risk}

【避けるべき罠】
${winCondition.avoidTraps}

これは最大${MAX_ROUNDS}回のレビューのうち${round}回目です。妥当なら承認してください。まだ弱ければ要修正とし、具体的にどこを直すべきか指摘してください。

JSON形式のみで回答：
{"verdict":"承認 または 要修正","comment":"評価コメント150文字"}`
      );
      log.push({ role: 'レビュー担当', action: 'verdict', content: `【第${round}回】${review.verdict}：${review.comment}` });

      if (review.verdict.includes('承認')) {
        approved = true;
      } else {
        previousFeedback = review.comment;
      }
    }

    // ⑤ 実行担当：タスク化
    log.push({ role: '実行担当', action: 'think', content: '結論をもとに、今週の実行タスクに落とし込みます。' });

    const execution = await callClaude(
      `あなたは実行担当のAI社員です。以下の結論をもとに、今週中に実行できる具体的なタスクリストを作ってください。
このアフィリエイト事業は「ユメサク」というツールを使っており、Yahoo!ショッピングでの商品検索、AI記事自動生成、X投稿文生成の機能が使えます。

【最終結論】
商品ジャンル：${strategy.recommendation}
理由：${strategy.reason}

JSON形式のみで回答：
{"tasks":["タスク1（具体的に）","タスク2","タスク3","タスク4"],"searchKeyword":"Yahoo!ショッピングで検索すべきキーワード","firstStep":"今すぐやるべき最初の一歩を50文字で"}`
    );
    log.push({ role: '実行担当', action: 'execute', content: `今すぐやること：${execution.firstStep}` });

    // ⑥ 結論
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
      winCondition,
      threeOptions,
      strategy,
      review,
      execution,
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

