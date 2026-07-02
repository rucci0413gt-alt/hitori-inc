// pages/index.js
import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runCouncil = async () => {
    setLoading(true);
    setResult(null);
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

  const roleColors = {
    'リサーチ担当': { bg: '#0F1F3D', border: '#1E3A6E', label: '#5B9BFF' },
    '戦略担当': { bg: '#1F1A3D', border: '#3A2E6E', label: '#A78BFF' },
    'レビュー担当': { bg: '#1F0F0F', border: '#5A2E2E', label: '#FF8B7A' },
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

        <div className="action-area">
          <button className="run-btn" onClick={runCouncil} disabled={loading}>
            {loading ? '会議中...' : '🏛️ 今週の会議を始める'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p className="loading-text">AI社員たちがリサーチ・議論しています...</p>
            <p className="loading-sub">30秒〜1分ほどかかります</p>
          </div>
        )}

        {result && (
          <div className="result">
            <p className="theme-label">📋 議題：{result.theme}</p>

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
              <p className="conclusion-label">✅ 最終結論</p>
              <p className="conclusion-item"><strong>推奨ジャンル：</strong>{result.strategy.recommendation}</p>
              <p className="conclusion-item"><strong>判定：</strong>{result.review.verdict}</p>
            </div>
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
        .action-area { text-align: center; padding: 20px 0 40px; }
        .run-btn { padding: 16px 32px; font-size: 16px; font-weight: 700; color: #0A0A0A; background: #FFFFFF; border: none; border-radius: 100px; cursor: pointer; font-family: inherit; transition: all 0.3s; }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .run-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(255,255,255,0.15); }
        .error { color: #FF6B6B; margin-top: 16px; font-size: 14px; }
        .loading { text-align: center; padding: 60px 20px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #FFFFFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        .loading-text { margin-top: 20px; font-size: 15px; }
        .loading-sub { color: #666; font-size: 13px; margin-top: 6px; }
        .result { max-width: 640px; margin: 0 auto; padding-bottom: 60px; }
        .theme-label { font-size: 14px; color: #999; margin: 0 0 24px; text-align: center; }
        .log-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .log-item { border-radius: 12px; padding: 16px; }
        .log-role { font-size: 12px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em; }
        .log-content { font-size: 14px; line-height: 1.8; margin: 0; color: #EEE; }
        .conclusion-card { background: #FFFFFF; color: #0A0A0A; border-radius: 16px; padding: 24px; }
        .conclusion-label { font-size: 13px; font-weight: 700; margin: 0 0 12px; color: #666; }
        .conclusion-item { font-size: 15px; margin: 0 0 8px; line-height: 1.7; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

