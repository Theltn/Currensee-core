import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '../hooks/useApi';

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [chats, setChats] = useState([
    { who: 'ai', text: "Hi! I can help explain options basics, trading strategies, risk management, and more. What would you like to learn about?" }
  ]);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Auto-scroll chat container (not the whole page) on new messages
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats, loading]);



  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const q = question.trim();
    setQuestion('');
    setChats(prev => [...prev, { who: 'me', text: q }]);
    setLoading(true);

    try {
      const res = await apiFetch('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q, maxTokens: 300 }),
      });

      if (!res.ok) {
        let errMessage = "Sorry—couldn't reach AI. Try again.";
        if (res.status === 401) errMessage = 'Please log in to use Ask AI.';
        if (res.status === 429) errMessage = "Rate limit reached. Please try again later.";
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

  const handleSuggestion = (text) => {
    setQuestion(text);
  };

  const suggestions = [
    "What are options?",
    "Explain Delta",
    "Best strategies for beginners",
    "Covered call vs naked call",
  ];

  return (
    <div className="page-container page-container--chat">
      <div className="ask-header fade-in">
        <h1 className="ask-title">Ask <span>Currensee</span></h1>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {chats.map((c, i) => (
          <div
            key={i}
            className={`chat-bubble ${c.who === 'me' ? 'chat-bubble--user slide-in-right' : 'chat-bubble--ai slide-in-left'}`}
          >
            {c.who === 'ai'
              ? <ReactMarkdown className="ai-markdown">{c.text}</ReactMarkdown>
              : c.text
            }
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble--loading">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

      </div>

      {/* Suggestion Chips */}
      {chats.length <= 2 && (
        <div className="suggestion-chips">
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleAsk} className="ask-input-bar">
        <input 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..." 
          autoComplete="off"
          className="input-modern"
        />
        <button disabled={loading} className="btn-primary" style={{ flexShrink: 0 }}>
          Send
        </button>
      </form>
      <div className="ask-disclaimer">Educational content only. Not financial advice.</div>
    </div>
  );
};

export default AskAI;
