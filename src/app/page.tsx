'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import SignInButton from '@/components/SignInButton';

interface Message {
  role: 'user' | 'guruji';
  content: string;
  sources?: Array<{ title: string; url: string }>;
}

const SUGGESTIONS = [
  { icon: '🧠', text: 'Explain Quantum Computing in simple terms' },
  { icon: '📈', text: 'Best investing strategies for beginners' },
  { icon: '🍛', text: 'How to make authentic Hyderabadi biryani' },
  { icon: '📝', text: 'How to prepare for the SAT exam effectively?' },
];

// Simple markdown renderer
function renderMarkdown(text: string): string {
  let html = text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*)(<li>)/g, '$1$3');
  html = html.replace(/(?<!<\/ul>|<\/ol>)(<li>)/g, '<ul>$1');
  html = html.replace(/(<\/li>)(?![\s\S]*?<li>)/g, '$1</ul>');

  // Handle tables
  const tableRegex = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (_, header: string, body: string) => {
    const headers = header.split('|').filter((h: string) => h.trim()).map((h: string) => `<th>${h.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  return `<p>${html}</p>`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isChatActive = messages.length > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleAsk(question: string) {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const gurujiMsg: Message = {
          role: 'guruji',
          content: data.error || 'Something went wrong. Please try again.',
        };
        setMessages((prev) => [...prev, gurujiMsg]);
        return;
      }

      const gurujiMsg: Message = {
        role: 'guruji',
        content: data.answer,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, gurujiMsg]);

      if (data.remaining !== undefined) {
        setRemaining(data.remaining);
      }
    } catch {
      const errorMsg: Message = {
        role: 'guruji',
        content: 'I seem to be having connection issues. Please try again in a moment. 🙏',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleAsk(input);
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <img src="/logo.png" alt="Got It Guruji" />
          <span className="navbar-brand">Got It <span>GURUJI</span></span>
        </a>
        <div className="navbar-right">
          <span className="navbar-tagline">LEARNING | GUIDANCE | GROWTH</span>
          <SignInButton />
        </div>
      </nav>

      {/* Hero / Landing */}
      <main className={`hero ${isChatActive ? 'chat-active' : ''}`}>
        {!isChatActive && (
          <>
            <img src="/logo-full.png" alt="Got It Guruji — Learning | Guidance | Growth" style={{ height: '350px', marginBottom: 'var(--space-lg)', borderRadius: '16px' }} />
            <p className="hero-description">
              Ask Guruji anything — get clear, wise, and well-researched answers powered by AI and real-time web search.
            </p>
          </>
        )}

        {/* Ask Bar — available to everyone */}
        <div className="ask-container">
          <form className="ask-bar" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Guruji anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <button type="submit" className="ask-btn" disabled={isLoading || !input.trim()}>
              {isLoading ? '...' : '🙏 Ask'}
            </button>
          </form>
          {remaining !== null && remaining <= 3 && (
            <p style={{ textAlign: 'center', color: 'var(--accent-gold)', fontSize: '0.8rem', marginTop: '8px' }}>
              {remaining} questions remaining today
            </p>
          )}
        </div>

        {/* Suggestions */}
        {!isChatActive && (
          <div className="suggestions">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => handleAsk(s.text)}
                disabled={isLoading}
              >
                <span className="chip-icon">{s.icon}</span>
                {s.text}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Chat Messages */}
      {isChatActive && (
        <div className="chat-area">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role === 'user' ? 'user-message' : 'guruji-message'}`}>
              {msg.role === 'guruji' && (
                <div className="guruji-avatar"><img src="/logo.png" alt="Guruji" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
              )}
              <div className="message-bubble">
                {msg.role === 'guruji' ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  msg.content
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources">
                    <div className="sources-title">Sources</div>
                    {msg.sources.map((source, si) => (
                      <a key={si} href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                        {source.title.length > 40 ? source.title.slice(0, 40) + '…' : source.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message guruji-message">
              <div className="guruji-avatar"><img src="/logo.png" alt="Guruji" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
              <div className="message-bubble">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Chat input at bottom when in chat mode */}
      {isChatActive && (
        <div className="chat-input-container">
          <form className="ask-bar" onSubmit={handleSubmit}>
            <input
              ref={isChatActive ? inputRef : undefined}
              type="text"
              placeholder="Ask another question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="ask-btn" disabled={isLoading || !input.trim()}>
              {isLoading ? '...' : '🙏 Ask'}
            </button>
          </form>
        </div>
      )}

      {/* Footer */}
      {!isChatActive && (
        <footer className="footer">
          © 2026 Got It Guruji — Powered by AI with Wisdom 🙏
        </footer>
      )}
    </>
  );
}
