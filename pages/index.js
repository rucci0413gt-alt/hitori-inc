// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [articleLoading, setArticleLoading] = useState(false);
  const [article, setArticle] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({ genre: '', articleTitle: '', likes: '', impressions: '', replies: '', memo: '' });
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSaved, setFbSaved] = useState(false);
  const [fbHistory, setFbHistory] = useState([]);

  const runCouncil = async () => {
    setLoading(true);
    setResult(null);
    setArticle(null);
    setError('');
    try {
      const res = await fetch('/api/research-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError('会議の実行に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const generateArticleFromConclusion = async () => {
    setArticleLoading(true);
    setArticle(null);
    try {
      const res = await fetch('/api/execute-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: result.execution.searchKeyword,
          genre: result.strategy.recommendation,
          reason: result.strategy.reason,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setArticle(data);
      setFbForm(f => ({ ...f, genre: result.strategy.recommendation, articleTitle: data.article.title }));
    } catch (e) {
      alert('記事生成に失敗しました');
    } finally {
      setArticleLoading(false);
    }
  };

  const copyText = async (text, i) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyFullArticle = async () => {
    if (!article) return;
    let text = `【${article.article.title}】\n\n${article.article.intro}\n\n`;
    article.article.reviews?.forEach((r, i) => {
      const item = article.items[i];
      text += `▼${r.rank}位：${r.headline}\n${r.description}\n👤${r.recommendFor}\n💰¥${item?.price?.toLocaleString()}\n🔗${item?.mylink}\n\n`;
    });
    text += `【まとめ】\n${article.article.conclusion}`;
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const loadFeedbackHistory = async () => {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success) setFbHistory(data.items);
    } catch (e) {}
  };

  useEffect(() => {
    if (showFeedback) loadFeedbackHistory();
  }, [showFeedback]);

  const saveFeedback = async () => {
    if (!fbForm.genre.trim()) {
      alert('ジャンルを入力してください');
      return;
    }
    setFbSaving(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbForm),
      });
      const data = await res.json();
      if (data.success) {
        setFbSaved(true);
        setTimeout(() => setFbSaved(false), 2000);
        setFbForm({ genre: '', articleTitle: '', likes: '', impressions: '', replies: '', memo: '' });
        loadFeedbackHistory();
      }
    } catch (e) {
      alert('保存に失敗しました');
    } finally {
      setFbSaving(false);
    }
  };

  const roleColors = {
    'リサーチ担当': { bg: '#0F1F3D', border: '#1E3A6E', label: '#5B9BFF' },
    '戦略担当': { bg: '#1F1A3D', border: '#3A2E6E', label: '#A78BFF' },
    'レビュー担当': { bg: '#1F0F0F', border: '#5A2E2E', label: '#FF8B7A' },
    '実行担当': { bg: '#0F1F16', border: '#1E5A3A', label: '#5BFFA0' },
    '会議': { bg: '#1A1F0F', border: '#4A5A2E', label: '#C4E17F' },
  };

  return (
    <>
      <Head>
        <title>HITORI Inc.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="container">
        <header className="header">
          <h1 className="logo">HITORI Inc.</h1>
          <p className="tagline">一人と、AI社員たちの会社。</p>
        </header>

        <div className="tab-switch">
          <button className={`tab-btn ${!showFeedback ? 'active' : ''}`} onClick={() => setShowFeedback(false)}>🏛️ 会議</button>
          <button className={`tab-btn ${showFeedback ? 'active' : ''}`} onClick={() => setShowFeedback(true)}>📊 振り返り</button>
        </div>

        {!showFeedback && (
          <>
            <div className="action-area">
              <button className="run-btn" onClick={runCouncil} disabled={loading}>
                {loading ? '会議中...' : '🏛️ 今週の会議を始める'}
              </button>
              {error && <p className="error">{error}</p>}
            </div>

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p className="loading-text">AI社員たちがリサーチ・議論・実行計画を作成中...</p>
                <p className="loading-sub">勝利条件の設定から実行タスクまで、2分ほどかかります</p>
              </div>
            )}

            {result && (
              <div className="result">
                <p className="theme-label">📋 議題：{result.theme}</p>
                <p className="rounds-label">🔄 議論ラウンド：{result.rounds}回 / {result.approved ? '正式承認' : '暫定採用'}</p>

                {result.winCondition && (
                  <div className="win-card">
                    <p className="win-label">🎯 勝利条件</p>
                    <p className="win-text">{result.winCondition.winCondition}</p>
                    <p className="win-sub">⚠️ 避けるべき罠：{result.winCondition.avoidTraps}</p>
                  </div>
                )}

                {result.threeOptions && (
                  <div className="options-card">
                    <p className="options-label">🔀 検討した3案</p>
                    <p className="option-item"><strong>A案：</strong>{result.threeOptions.optionA}</p>
                    <p className="option-item"><strong>B案：</strong>{result.threeOptions.optionB}</p>
                    <p className="option-item"><strong>C案：</strong>{result.threeOptions.optionC}</p>
                  </div>
                )}

                <div className="log-list">
                  {result.log.map((item, i) => {
                    const color = roleColors[item.role] || roleColors['リサーチ担当'];
                    return (
                      <div key={i} className="log-item" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                        <div className="log-role" style={{ color: color.label }}>{item.role}</div>
                        <p className="log-content">{item.content}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="conclusion-card">
                  <p className="conclusion-label">{result.approved ? '✅ 正式結論' : '⚠️ 暫定結論'}</p>
                  <p className="conclusion-item"><strong>推奨ジャンル：</strong>{result.strategy.recommendation}</p>
                  <p className="conclusion-item"><strong>理由：</strong>{result.strategy.reason}</p>
                  <p className="conclusion-item"><strong>最終判定：</strong>{result.review.verdict}</p>
                </div>

                {result.execution && (
                  <div className="execution-card">
                    <p className="execution-label">⚡ 今週の実行タスク</p>
                    <p className="execution-first"><strong>今すぐ：</strong>{result.execution.firstStep}</p>
                    <ul className="task-list">
                      {result.execution.tasks?.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                    <p className="execution-keyword">🔍 検索キーワード：{result.execution.searchKeyword}</p>
                  </div>
                )}

                {result.execution && (
                  <div className="article-action">
                    <button className="article-btn" onClick={generateArticleFromConclusion} disabled={articleLoading}>
                      {articleLoading ? '記事生成中...' : '📝 この結論で記事を自動生成する'}
                    </button>
                  </div>
                )}

                {article && (
                  <div className="article-result">
                    <p className="article-title">{article.article.title}</p>
                    <p className="article-intro">{article.article.intro}</p>
                    {article.article.reviews?.map((r, i) => {
                      const item = article.items[i];
                      return (
                        <div key={i} className="article-review">
                          <p className="article-review-head">{r.rank}位：{r.headline}</p>
                          {item?.image && <img src={item.image} alt={item.name} className="article-image" />}
                          <p className="article-review-name">{item?.name}</p>
                          <p className="article-review-desc">{r.description}</p>
                          <p className="article-review-price">¥{item?.price?.toLocaleString()}</p>
                          {item?.mylink && (
                            <button className="mylink-btn" onClick={() => copyText(item.mylink, `mylink-${i}`)}>
                              {copiedIndex === `mylink-${i}` ? '✓ コピー済み' : '🔗 MyLinkをコピー'}
                            </button>
                          )}
                          {r.xPost && (
                            <div className="x-post-box">
                              <div className="x-post-header">
                                <span className="x-post-label">𝕏 投稿用テキスト</span>
                                <button className={`copy-btn ${copiedIndex === i ? 'copied' : ''}`} onClick={() => copyText(r.xPost, i)}>
                                  {copiedIndex === i ? '✓ コピー済み' : 'コピー'}
                                </button>
                              </div>
                              <pre className="x-post-text">{r.xPost}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="article-conclusion">{article.article.conclusion}</p>
                    <button className="copy-all-btn" onClick={copyFullArticle}>
                      {copiedAll ? '✓ コピーしました！' : '📋 記事全文をコピー（MyLink付き）'}
                    </button>
                    <button className="to-feedback-btn" onClick={() => setShowFeedback(true)}>
                      📊 投稿後、振り返りタブで結果を記録する →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {showFeedback && (
          <div className="feedback-area">
            <p className="section-label">📝 投稿の反応を記録する</p>

            <div className="field">
              <label className="field-label">ジャンル</label>
              <input type="text" value={fbForm.genre} onChange={e => setFbForm(f => ({ ...f, genre: e.target.value }))} placeholder="例：接触冷感インナー" className="input" />
            </div>

            <div className="field">
              <label className="field-label">記事タイトル</label>
              <input type="text" value={fbForm.articleTitle} onChange={e => setFbForm(f => ({ ...f, articleTitle: e.target.value }))} placeholder="投稿した記事のタイトル" className="input" />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">いいね数</label>
                <input type="number" value={fbForm.likes} onChange={e => setFbForm(f => ({ ...f, likes: e.target.value }))} placeholder="0" className="input" />
              </div>
              <div className="field">
                <label className="field-label">インプレッション</label>
                <input type="number" value={fbForm.impressions} onChange={e => setFbForm(f => ({ ...f, impressions: e.target.value }))} placeholder="0" className="input" />
              </div>
              <div className="field">
                <label className="field-label">返信数</label>
                <input type="number" value={fbForm.replies} onChange={e => setFbForm(f => ({ ...f, replies: e.target.value }))} placeholder="0" className="input" />
              </div>
            </div>

            <div className="field">
              <label className="field-label">メモ（任意）</label>
              <textarea value={fbForm.memo} onChange={e => setFbForm(f => ({ ...f, memo: e.target.value }))} placeholder="気づいたことがあれば" className="textarea" rows={2} />
            </div>

            <button className="run-btn full" onClick={saveFeedback} disabled={fbSaving}>
              {fbSaving ? '保存中...' : fbSaved ? '✓ 保存しました' : '💾 記録する'}
            </button>

            {fbHistory.length > 0 && (
              <div className="fb-history">
                <p className="fb-history-title">📋 記録履歴（{fbHistory.length}件）</p>
                {fbHistory.map((item) => (
                  <div key={item.id} className="fb-history-item">
                    <p className="fb-history-genre">{item.genre}</p>
                    <p className="fb-history-title2">{item.articleTitle}</p>
                    <p className="fb-history-stats">👍{item.likes} 👁️{item.impressions} 💬{item.replies}</p>
                    {item.memo && <p className="fb-history-memo">📝 {item.memo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx global>{`
        body { margin: 0; padding: 0; font-family: 'Noto Sans JP', 'Inter', -apple-system, sans-serif; background: #0A0A0A; color: #FFFFFF; }
        * { box-sizing: border-box; }
        .container { min-height: 100vh; padding: 20px; }
        .header { text-align: center; padding: 40px 20px 20px; }
        .logo { font-family: 'Inter', sans-serif; font-size: clamp(28px, 7vw, 44px); font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
        .tagline { font-size: 14px; color: #999; margin: 0; }
        .tab-switch { display: flex; gap: 8px; max-width: 400px; margin: 0 auto 24px; }
        .tab-btn { flex: 1; padding: 12px; font-size: 14px; font-weight: 700; border: 1px solid #333; border-radius: 100px; background: transparent; color: #999; cursor: pointer; font-family: inherit; transition: all 0.3s; }
        .tab-btn.active { background: #FFFFFF; color: #0A0A0A; border-color: #FFFFFF; }
        .action-area { text-align: center; padding: 20px 0 40px; }
        .run-btn { padding: 16px 32px; font-size: 16px; font-weight: 700; color: #0A0A0A; background: #FFFFFF; border: none; border-radius: 100px; cursor: pointer; font-family: inherit; transition: all 0.3s; }
        .run-btn.full { width: 100%; max-width: 640px; margin: 20px auto 0; display: block; }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .run-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(255,255,255,0.15); }
        .error { color: #FF6B6B; margin-top: 16px; font-size: 14px; }
        .loading { text-align: center; padding: 60px 20px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #FFFFFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        .loading-text { margin-top: 20px; font-size: 15px; }
        .loading-sub { color: #666; font-size: 13px; margin-top: 6px; }
        .result { max-width: 640px; margin: 0 auto; padding-bottom: 60px; }
        .theme-label { font-size: 14px; color: #999; margin: 0 0 8px; text-align: center; }
        .rounds-label { font-size: 13px; color: #999; margin: 0 0 20px; text-align: center; }
        .win-card { background: #1A1500; border: 1px solid #4A3D00; border-radius: 12px; padding: 18px; margin-bottom: 16px; }
        .win-label { font-size: 12px; font-weight: 700; color: #FFD54B; margin: 0 0 8px; }
        .win-text { font-size: 14px; line-height: 1.7; margin: 0 0 8px; color: #EEE; }
        .win-sub { font-size: 12px; color: #AAA; margin: 0; }
        .options-card { background: #10151F; border: 1px solid #2A3A5E; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
        .options-label { font-size: 12px; font-weight: 700; color: #5B9BFF; margin: 0 0 10px; }
        .option-item { font-size: 13px; line-height: 1.7; margin: 0 0 6px; color: #DDD; }
        .log-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .log-item { border-radius: 12px; padding: 16px; }
        .log-role { font-size: 12px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em; }
        .log-content { font-size: 14px; line-height: 1.8; margin: 0; color: #EEE; white-space: pre-wrap; }
        .conclusion-card { background: #FFFFFF; color: #0A0A0A; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
        .conclusion-label { font-size: 13px; font-weight: 700; margin: 0 0 12px; color: #666; }
        .conclusion-item { font-size: 15px; margin: 0 0 8px; line-height: 1.7; }
        .execution-card { background: #0F1F16; border: 1px solid #1E5A3A; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
        .execution-label { font-size: 13px; font-weight: 700; color: #5BFFA0; margin: 0 0 14px; }
        .execution-first { font-size: 14px; margin: 0 0 14px; color: #FFF; line-height: 1.7; }
        .task-list { margin: 0 0 14px; padding-left: 20px; }
        .task-list li { font-size: 13px; color: #DDD; line-height: 1.9; }
        .execution-keyword { font-size: 12px; color: #999; margin: 0; }
        .article-action { text-align: center; margin-bottom: 24px; }
        .article-btn { padding: 14px 28px; font-size: 15px; font-weight: 700; color: #0A0A0A; background: #5BFFA0; border: none; border-radius: 100px; cursor: pointer; font-family: inherit; transition: all 0.3s; }
        .article-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .article-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(91,255,160,0.25); }
        .article-result { background: #FFFFFF; color: #0A0A0A; border-radius: 16px; padding: 24px; }
        .article-title { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
        .article-intro { font-size: 14px; color: #444; line-height: 1.8; margin: 0 0 20px; }
        .article-review { border-top: 1px solid #EEE; padding: 16px 0; }
        .article-review-head { font-size: 15px; font-weight: 700; margin: 0 0 8px; }
        .article-image { width: 100%; max-width: 200px; display: block; margin: 0 auto 8px; }
        .article-review-name { font-size: 12px; color: #999; margin: 0 0 6px; }
        .article-review-desc { font-size: 13px; color: #444; line-height: 1.7; margin: 0 0 6px; }
        .article-review-price { font-size: 15px; font-weight: 700; margin: 0; }
        .article-conclusion { font-size: 13px; color: #444; line-height: 1.8; margin: 16px 0 0; padding-top: 16px; border-top: 1px solid #EEE; }
        .mylink-btn { display: block; width: 100%; padding: 8px; font-size: 12px; font-weight: 600; color: #FFF; background: #16A34A; border: none; border-radius: 8px; cursor: pointer; margin-top: 8px; }
        .x-post-box { background: #F8F9FF; border: 1px solid #E0E7FF; border-radius: 8px; padding: 12px; margin-top: 10px; }
        .x-post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .x-post-label { font-size: 11px; font-weight: 700; color: #5B6AD0; }
        .copy-btn { padding: 5px 12px; font-size: 11px; font-weight: 600; color: #FFF; background: #0A0A0A; border: none; border-radius: 100px; cursor: pointer; font-family: inherit; }
        .copy-btn.copied { background: #22C55E; }
        .x-post-text { font-size: 12px; color: #333; line-height: 1.7; white-space: pre-wrap; word-break: break-all; margin: 0; }
        .copy-all-btn { width: 100%; padding: 14px; font-size: 14px; font-weight: 700; color: #0A0A0A; background: #FFFFFF; border: 2px solid #0A0A0A; border-radius: 12px; cursor: pointer; margin-top: 20px; }
        .to-feedback-btn { width: 100%; padding: 12px; font-size: 13px; font-weight: 600; color: #0A0A0A; background: #F0F0F0; border: none; border-radius: 12px; cursor: pointer; margin-top: 12px; }
        .feedback-area { max-width: 640px; margin: 0 auto; padding-bottom: 60px; }
        .section-label { font-size: 15px; font-weight: 700; margin: 0 0 24px; }
        .field { margin-bottom: 20px; }
        .field-row { display: flex; gap: 10px; }
        .field-row .field { flex: 1; }
        .field-label { display: block; font-size: 12px; font-weight: 600; color: #999; margin-bottom: 8px; }
        .input { width: 100%; padding: 12px 14px; font-size: 14px; border: 1px solid #333; border-radius: 10px; outline: none; font-family: inherit; background: #1A1A1A; color: #FFF; }
        .textarea { width: 100%; padding: 12px 14px; font-size: 14px; border: 1px solid #333; border-radius: 10px; outline: none; font-family: inherit; background: #1A1A1A; color: #FFF; resize: vertical; }
        .fb-history { margin-top: 32px; }
        .fb-history-title { font-size: 14px; font-weight: 700; margin: 0 0 16px; }
        .fb-history-item { background: #1A1A1A; border: 1px solid #333; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
        .fb-history-genre { font-size: 13px; font-weight: 700; color: #5BFFA0; margin: 0 0 4px; }
        .fb-history-title2 { font-size: 12px; color: #CCC; margin: 0 0 6px; }
        .fb-history-stats { font-size: 12px; color: #999; margin: 0; }
        .fb-history-memo { font-size: 12px; color: #999; margin: 6px 0 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

