import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useApp } from '../context/AppContext.jsx';

/**
 * IceBreakersPage
 * ---------------------------------------------------------------------------
 * Manages up to 4 Instagram Messenger Ice Breakers:
 *   - Question prompt shown before a user starts a DM
 *   - Automated reply sent when tapped
 *   - Reorder up/down, delete, and simulated "Sync to Instagram Profile"
 */
export default function IceBreakersPage() {
  const {
    account,
    iceBreakers,
    addIceBreaker,
    deleteIceBreaker,
    moveIceBreaker,
    syncIceBreakersToInstagram,
  } = useApp();

  const [question, setQuestion] = useState('');
  const [autoReply, setAutoReply] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewResponse, setPreviewResponse] = useState(null);

  const pendingSyncCount = iceBreakers.filter((ib) => !ib.synced).length;

  // Validate and add a new Ice Breaker prompt (max 4 allowed)
  const handleAdd = (e) => {
    e.preventDefault();
    if (question.trim().length < 4) {
      setErrorMsg('Question prompt must be at least 4 characters.');
      return;
    }
    if (autoReply.trim().length < 4) {
      setErrorMsg('Automated reply text must be at least 4 characters.');
      return;
    }

    const payload = `IB_${question
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 18)}`;

    const ok = addIceBreaker({
      question: question.trim(),
      payload,
      autoReply: autoReply.trim(),
    });

    if (ok) {
      setQuestion('');
      setAutoReply('');
      setErrorMsg('');
    }
  };

  return (
    <DashboardLayout title="Ice Breakers">
      <div className="page-head">
        <div>
          <h1 className="page-title">Instagram Ice Breakers</h1>
          <p className="page-subtitle">
            Configure up to 4 tap-to-start conversation prompts in your Messenger greeting.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={syncIceBreakersToInstagram}
        >
          <RefreshCw size={15} />
          <span>
            {pendingSyncCount > 0
              ? `Sync ${pendingSyncCount} Changes to Instagram`
              : 'Sync to Instagram Profile'}
          </span>
        </button>
      </div>

      <div className="studio-grid">
        {/* Left: Configured List + Add Form */}
        <div className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Configured Prompts ({iceBreakers.length} / 4)</h2>
              <p className="panel-sub">Instagram caps Ice Breakers at 4 active items</p>
            </div>
          </div>

          <div className="icebreaker-list">
            {iceBreakers.length === 0 ? (
              <p className="field-hint">No Ice Breakers configured yet. Add your first below.</p>
            ) : (
              iceBreakers.map((item, idx) => (
                <div key={item.id} className="icebreaker-card">
                  <div className="icebreaker-top">
                    <div>
                      <div className="icebreaker-question">
                        0{idx + 1}. {item.question}
                      </div>
                      <div className="field-hint">
                        Payload: <span className="tabular-num">{item.payload}</span> ·{' '}
                        {item.synced ? 'Synced' : 'Pending sync'}
                      </div>
                    </div>

                    <div className="icebreaker-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        disabled={idx === 0}
                        onClick={() => moveIceBreaker(item.id, 'up')}
                        aria-label="Move up"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        disabled={idx === iceBreakers.length - 1}
                        onClick={() => moveIceBreaker(item.id, 'down')}
                        aria-label="Move down"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => deleteIceBreaker(item.id)}
                        aria-label="Delete ice breaker"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.autoReply}</p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAdd}
            className="wizard-form-col"
            style={{ paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}
          >
            <h3 className="panel-title">Add Ice Breaker</h3>
            <div className="field-group">
              <label htmlFor="ib-question" className="field-label">
                Question Prompt (User Taps This)
              </label>
              <input
                id="ib-question"
                type="text"
                className="input-control"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Send me your Notion dashboard template"
                disabled={iceBreakers.length >= 4}
              />
            </div>

            <div className="field-group">
              <label htmlFor="ib-reply" className="field-label">
                Automated Postback Reply
              </label>
              <textarea
                id="ib-reply"
                className="textarea-control"
                value={autoReply}
                onChange={(e) => setAutoReply(e.target.value)}
                placeholder="Write the message sent automatically when the prompt is tapped..."
                disabled={iceBreakers.length >= 4}
              />
            </div>

            {errorMsg && <span className="field-error">{errorMsg}</span>}

            <div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={iceBreakers.length >= 4}
              >
                <Plus size={15} />
                <span>
                  {iceBreakers.length >= 4 ? 'Maximum 4 Ice Breakers Reached' : 'Add Prompt'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Interactive Messenger Welcome Preview */}
        <aside className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Messenger Welcome Preview</h2>
              <p className="panel-sub">Click any prompt below to preview the postback reply</p>
            </div>
          </div>

          <div className="messenger-preview">
            <div className="account-row" style={{ padding: 0 }}>
              <img
                src={account.avatarUrl}
                alt={`${account.username} avatar`}
                className="account-avatar"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="account-handle">@{account.username}</div>
                <div className="account-meta">Tap a prompt to start chatting</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {iceBreakers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="messenger-prompt-btn"
                  onClick={() => setPreviewResponse(item.autoReply)}
                >
                  {item.question}
                </button>
              ))}
            </div>

            {previewResponse && (
              <div className="sim-bubble sim-bubble--bot" style={{ maxWidth: '100%' }}>
                <div>{previewResponse}</div>
                <span className="sim-bubble-meta">Instant Ice Breaker Postback</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
