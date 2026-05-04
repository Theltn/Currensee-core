import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '../hooks/useApi';
import { fetchStockCached } from '../utils/stockCache';

const AskAI = () => {
  const [question, setQuestion] = useState('');
  const [chats, setChats] = useState([
    { who: 'ai', text: "Hi! I can help explain options basics, trading strategies, risk management, and more. I can also see your current portfolio — feel free to ask about it." }
  ]);
  const [loading, setLoading] = useState(false);
  const [portfolioCtx, setPortfolioCtx] = useState(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll chat container (not the whole page) on new messages
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats, loading]);

  // Pull portfolio + open option positions once so the AI can reference them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, oRes] = await Promise.all([
          apiFetch('/portfolio').catch(() => null),
          apiFetch('/options/positions').catch(() => null),
        ]);
        if (cancelled) return;

        const ctx = { cash: 0, holdings: [], options: [] };
        if (pRes?.ok) {
          const p = await pRes.json();
          ctx.cash = p.cash ?? 0;

          // Fetch live prices for each holding so the AI can reason about real P/L.
          // fetchStockCached uses localStorage (30-min TTL), so this is essentially free
          // when the user has already loaded Portfolio/Trade in the same session.
          const enriched = await Promise.all((p.holdings || []).map(async (h) => {
            let currentPrice = h.avgCost;
            try {
              const data = await fetchStockCached(h.ticker);
              const td = data?.tradingData;
              if (Array.isArray(td) && td.length > 0) currentPrice = td[td.length - 1].c;
            } catch { /* fall back to avgCost */ }
            const totPL = (currentPrice - h.avgCost) * h.shares;
            return {
              ticker: h.ticker,
              shares: h.shares,
              avgCost: h.avgCost,
              currentPrice,
              totPL,
            };
          }));
          if (cancelled) return;
          ctx.holdings = enriched;
        }
        if (oRes?.ok) {
          const o = await oRes.json();
          ctx.options = (o.positions || []).map(pos => ({
            ticker: pos.ticker,
            optionType: pos.optionType,
            strike: pos.strike,
            contracts: pos.contracts,
            premium: pos.premium,
            daysLeft: pos.daysLeft,
          }));
        }
        ctx.equity = ctx.cash + ctx.holdings.reduce((s, h) => s + h.currentPrice * h.shares, 0);
        ctx.totalPL = ctx.holdings.reduce((s, h) => s + h.totPL, 0);
        setPortfolioCtx(ctx);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
        body: JSON.stringify({
          question: q,
          maxTokens: 500,
          portfolio: portfolioCtx || undefined,
        }),
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

  const hasPortfolio = portfolioCtx && (portfolioCtx.holdings.length > 0 || portfolioCtx.options.length > 0);
  const suggestions = hasPortfolio
    ? [
        "How is my portfolio diversified?",
        "What's the biggest risk in my positions?",
        "Explain my open option positions",
        "What strategies fit my current holdings?",
      ]
    : [
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
