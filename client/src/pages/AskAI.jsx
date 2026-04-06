import React, { useState, useEffect } from 'react';

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [chats, setChats] = useState([
    { who: 'ai', text: "Hi! Ask about options basics, risk, strikes, and more. I'm educational, not advice." }
  ]);
  const [loading, setLoading] = useState(false);

  // Simplified format for React
  const formatText = (text) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const q = question.trim();
    setQuestion('');
    setChats(prev => [...prev, { who: 'me', text: q }]);
    setLoading(true);

    try {
      const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${url}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // needed if backend enforces JWT/cookies
        body: JSON.stringify({ question: q, maxTokens: 300 })
      });

      if (!res.ok) {
        let errMessage = "Sorry—couldn't reach AI. Try again.";
        if (res.status === 401) errMessage = 'Please log in to use Ask AI.';
        if (res.status === 429) errMessage = "We've hit the monthly AI limit. Please try next month.";
        if (res.status === 503) errMessage = 'AI is temporarily offline. Please try again later.';
        setChats(prev => [...prev, { who: 'ai', text: errMessage }]);
      } else {
        const payload = await res.json();
        setChats(prev => [...prev, { who: 'ai', text: payload?.answer ? payload.answer : '(no answer)' }]);
      }
    } catch (err) {
      setChats(prev => [...prev, { who: 'ai', text: 'Network error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '28px auto', padding: '0 18px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: 'white' }}>Ask <span style={{ color: '#00b3b3' }}>Currensee</span></h1>
        <a href="/" style={{ background: 'linear-gradient(135deg, #00b3b3, #3da8f5)', color: '#04222a', padding: '12px 16px', borderRadius: '12px', fontWeight: 'bold', textDecoration: 'none' }}>← Back</a>
      </div>

      <div style={{ background: '#12161d', border: '1px solid #1d2a36', borderRadius: '14px', padding: '14px', minHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 30px rgba(0, 0, 0, .45)' }}>
        {chats.map((c, i) => (
          <div key={i} style={{ 
            maxWidth: '80%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #1d2a36', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'white',
            alignSelf: c.who === 'me' ? 'flex-end' : 'flex-start',
            background: c.who === 'me' ? '#0b1117' : '#10161d'
          }}>
            {formatText(c.text)}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#10161d', maxWidth: '80%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #1d2a36', color: 'white', fontStyle: 'italic', opacity: 0.8 }}>
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
        <input 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..." 
          autoComplete="off"
          style={{ flex: 1, background: '#0f141a', border: '1px solid #1d2a36', color: '#e6f0f2', borderRadius: '12px', padding: '12px', outline: 'none' }}
        />
        <button disabled={loading} style={{ background: 'linear-gradient(135deg, #00b3b3, #3da8f5)', color: '#04222a', border: 'none', padding: '12px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          Send
        </button>
      </form>
      <div style={{ color: '#b8c7cc', fontSize: '12px', marginTop: '10px' }}>Disclaimer: Educational content only. Not financial advice.</div>
    </div>
  );
};

export default AskAI;
