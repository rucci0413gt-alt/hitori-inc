// pages/index.js
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>HITORI Inc.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="container">
        <h1 className="logo">HITORI Inc.</h1>
        <p className="tagline">一人と、AI社員たちの会社。</p>
      </div>
      <style jsx global>{`
        body { margin: 0; padding: 0; font-family: 'Noto Sans JP', 'Inter', -apple-system, sans-serif; background: #0A0A0A; color: #FFFFFF; }
        * { box-sizing: border-box; }
        .container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; }
        .logo { font-family: 'Inter', sans-serif; font-size: clamp(32px, 8vw, 56px); font-weight: 700; margin: 0 0 12px; letter-spacing: -0.02em; }
        .tagline { font-size: clamp(14px, 2vw, 18px); color: #999; margin: 0; }
      `}</style>
    </>
  );
}
