import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Moon, Send, Sun, Zap } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

const SANDBOX_RULES = [
  {
    name: "Pricing Keyword Rule",
    keywords: ["price", "fees", "cost", "rate"],
    reply: "Hamara starter plan ₹999/month hai! Full details ke liye batao.",
  },
  {
    name: "Welcome Greeting",
    keywords: ["hello", "hi", "hey", "namaste"],
    reply: "Hey dost! Welcome! Price jaanne ke liye 'price' likho ya koi bhi sawal poocho.",
  },
  {
    name: "Collab / Work",
    keywords: ["collab", "work", "freelance"],
    reply: "Work ya collab ke liye apna brief yahan drop karo, boss jaldi reply karenge!",
  },
];

const FAQS = [
  {
    q: "How does this tool differ from ManyChat?",
    a: "No monthly per-contact fees. You bring your own AI keys (Groq, Gemini, OpenAI, OpenRouter) and control both keyword rules and AI fallback from one self-hosted workspace.",
  },
  {
    q: "What is Hybrid mode (Rules + AI)?",
    a: "Incoming DMs first check your exact/contains keyword rules for instant zero-cost replies. If no keyword matches, your AI assistant replies naturally using your business info.",
  },
  {
    q: "How does Follow-Gate work?",
    a: "When enabled, non-followers automatically receive a friendly follow reminder before the bot starts answering their questions.",
  },
  {
    q: "Is my Instagram token and AI key safe?",
    a: "Yes. Both Instagram access tokens and your AI provider keys are encrypted with AES-256-GCM before being stored in MongoDB and are never sent back to the browser.",
  },
];

export default function LandingPage() {
  const { isAuthenticated, startInstagramLogin, theme, toggleTheme, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [simInput, setSimInput] = useState("");
  const [simHistory, setSimHistory] = useState([
    {
      id: "init_1",
      from: "bot",
      text: 'Try typing "hello", "price", or ask a random question to test Hybrid (Rules + AI) mode.',
      ruleLabel: "Sandbox Ready",
    },
  ]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      showToast(`Instagram login error: ${err}`, "error");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast]);

  const runSimulation = (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const userMsg = { id: `u_${Date.now()}`, from: "user", text: trimmed };
    const lower = trimmed.toLowerCase();
    const matched = SANDBOX_RULES.find((r) =>
      r.keywords.some((kw) => lower.includes(kw))
    );

    const botMsg = matched
      ? {
          id: `b_${Date.now() + 1}`,
          from: "bot",
          text: matched.reply,
          ruleLabel: `Rule Match: ${matched.name}`,
        }
      : {
          id: `b_${Date.now() + 1}`,
          from: "bot",
          text: `Haan dost! "${trimmed}" ke baare mein detail chahiye toh thoda aur batao—main yahin help ke liye hoon!`,
          ruleLabel: "AI Fallback Reply",
        };

    setSimHistory((prev) => [...prev.slice(-4), userMsg, botMsg]);
    setSimInput("");
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="brand-wordmark">
            <span className="brand-mark-box">
              <Zap size={15} />
            </span>
            <span>InstaAuto</span>
          </Link>

          <nav className="landing-nav" aria-label="Landing page sections">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#comparison" className="landing-nav-link">Comparison</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
            {isAuthenticated && (
              <Link to="/dashboard" className="landing-nav-link">Dashboard</Link>
            )}
          </nav>

          <div className="landing-header-actions">
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Open Dashboard
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={startInstagramLogin}
              >
                Connect Instagram
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="landing-container">
          <div className="hero-grid">
            <div>
              <p className="hero-kicker">BYOK Instagram DM Automation Studio</p>
              <h1 className="hero-title">
                Automate Instagram DMs with Keyword Rules &amp; your own AI keys.
              </h1>
              <p className="hero-description">
                Connect your Instagram Professional account in one click. Combine instant
                keyword auto-replies with Groq, Gemini, OpenAI, or OpenRouter AI fallback,
                follow-gating, and a live leads inbox.
              </p>

              <div className="hero-cta-row">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="btn btn-primary">
                    Go to Dashboard
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startInstagramLogin}
                  >
                    Connect with Instagram
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>

              <div className="hero-meta-line">
                <span>Instagram Business Login</span>
                <span aria-hidden="true">·</span>
                <span>Rules + AI Hybrid Engine</span>
                <span aria-hidden="true">·</span>
                <span>AES-256 Encrypted Keys</span>
              </div>
            </div>

            <div className="hero-simulator" aria-label="Interactive DM simulator">
              <div className="sim-topbar">
                <div className="sim-account">
                  <img
                    src="/assets/aistudio/user-avatar_98a5e3b9.png"
                    alt="Demo bot avatar"
                    className="sim-avatar"
                  />
                  <span>@your.bot</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                  Hybrid Mode Preview
                </span>
              </div>

              <div className="sim-messages">
                {simHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`sim-bubble ${
                      item.from === "user" ? "sim-bubble--user" : "sim-bubble--bot"
                    }`}
                  >
                    <div>{item.text}</div>
                    {item.ruleLabel && (
                      <span className="sim-bubble-meta">{item.ruleLabel}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="sim-prompts">
                <span className="field-hint">Quick test:</span>
                <button
                  type="button"
                  className="sim-prompt-btn"
                  onClick={() => runSimulation("hello")}
                >
                  hello
                </button>
                <button
                  type="button"
                  className="sim-prompt-btn"
                  onClick={() => runSimulation("price kya hai?")}
                >
                  price kya hai?
                </button>
                <button
                  type="button"
                  className="sim-prompt-btn"
                  onClick={() => runSimulation("timing batao")}
                >
                  timing batao (AI)
                </button>
              </div>

              <form
                className="sim-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  runSimulation(simInput);
                }}
              >
                <input
                  type="text"
                  className="input-control"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Send a test DM..."
                  aria-label="Test message input"
                />
                <button type="submit" className="btn btn-primary btn-sm" aria-label="Send test">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>

          <div className="proof-strip">
            <div className="proof-cell">
              <span className="proof-value tabular-num">3 Modes</span>
              <span className="proof-label">Rules Only, AI Only, or Hybrid</span>
            </div>
            <div className="proof-cell">
              <span className="proof-value tabular-num">BYOK</span>
              <span className="proof-label">Groq, Gemini, OpenAI &amp; Custom APIs</span>
            </div>
            <div className="proof-cell">
              <span className="proof-value tabular-num">2.5s</span>
              <span className="proof-label">Smart debounce merges rapid messages</span>
            </div>
            <div className="proof-cell">
              <span className="proof-value tabular-num">AES-256</span>
              <span className="proof-label">Encrypted tokens &amp; API keys at rest</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Everything needed for smart Instagram DMs</h2>
            <p className="section-lead">
              Built for creators, businesses, and freelancers managing client accounts.
            </p>
          </div>

          <div className="capabilities-grid">
            <article className="capability-card capability-card--wide">
              <span className="capability-index">01. HYBRID AUTOMATION ENGINE</span>
              <h3 className="capability-title">Keyword Rules + AI Fallback together</h3>
              <p className="capability-copy">
                Reply instantly with fixed pricing, links, or course info using exact/contains
                keyword matching—and let your AI assistant handle every organic question naturally.
              </p>
              <div className="capability-meta">
                Zero AI cost on keyword hits · Word-boundary matching · 2.5s message batching
              </div>
            </article>

            <article className="capability-card">
              <span className="capability-index">02. BYOK AI PROVIDERS</span>
              <h3 className="capability-title">Multi-model fallback pipeline</h3>
              <p className="capability-copy">
                Add Groq, Gemini, OpenAI, OpenRouter, or any OpenAI-compatible provider with
                automatic fallback if a model hits rate limits.
              </p>
              <div className="capability-meta">Encrypted keys · Custom system prompts</div>
            </article>

            <article className="capability-card">
              <span className="capability-index">03. FOLLOW-GATE</span>
              <h3 className="capability-title">Grow followers automatically</h3>
              <p className="capability-copy">
                Optionally require users to follow your Instagram account before the bot unlocks
                replies—with your custom reminder message.
              </p>
              <div className="capability-meta">Toggleable per account · Custom prompt</div>
            </article>

            <article className="capability-card">
              <span className="capability-index">04. LIVE LEADS INBOX</span>
              <h3 className="capability-title">Track leads &amp; DM transcripts</h3>
              <p className="capability-copy">
                See every user who DMs your bot, their follower status, and full conversation
                history updating automatically in real time.
              </p>
              <div className="capability-meta">Follower status · Auto-refreshing chat log</div>
            </article>

            <article className="capability-card">
              <span className="capability-index">05. ONE-CLICK PAUSE</span>
              <h3 className="capability-title">Full control &amp; rate-limit protection</h3>
              <p className="capability-copy">
                Pause or switch bot modes anytime from the dashboard, backed by built-in spam
                rate limiting and typing indicators.
              </p>
              <div className="capability-meta">8 msgs/min anti-spam · Media reply cooldown</div>
            </article>
          </div>
        </div>
      </section>

      <section id="comparison" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Why self-host InstaAuto?</h2>
            <p className="section-lead">
              Own your MongoDB database, AI keys, and automation logic with zero monthly limits.
            </p>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Closed SaaS Tools</th>
                  <th>InstaAuto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Contact Pricing</td>
                  <td>Scales up per 1,000 contacts</td>
                  <td className="comparison-highlight">$0 · Unlimited contacts</td>
                </tr>
                <tr>
                  <td>Bring Your Own AI Keys</td>
                  <td>Locked / expensive add-on</td>
                  <td className="comparison-highlight">Groq, Gemini, OpenAI, Custom</td>
                </tr>
                <tr>
                  <td>Hybrid Rules + AI Mode</td>
                  <td>Limited</td>
                  <td className="comparison-highlight">Built-in with fallback pipeline</td>
                </tr>
                <tr>
                  <td>Source Code &amp; Database</td>
                  <td>Closed platform</td>
                  <td className="comparison-highlight">100% yours (Node + MongoDB)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Frequently asked questions</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={faq.q} className="faq-item">
                  <button
                    type="button"
                    className="faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && <div className="faq-answer">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span>InstaAuto · Self-Hosted Instagram DM Automation</span>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#comparison">Comparison</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}