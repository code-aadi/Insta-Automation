import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, KeyRound, RefreshCw, Save } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import RangeSlider from "../components/RangeSlider.jsx";
import ButtonBuilder from "../components/ButtonBuilder.jsx";
import { useApp } from "../context/AppContext.jsx";

const TOKEN_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000;
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const { account, stats, refreshStats, updateSettings, refreshInstagramToken } = useApp();

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  const [replyDelaySeconds, setReplyDelaySeconds] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [botMode, setBotMode] = useState("hybrid");
  const [requireFollow, setRequireFollow] = useState(false);
  const [followMessage, setFollowMessage] = useState("");
  const [followButtons, setFollowButtons] = useState([]);
  const [followReminderCooldownHours, setFollowReminderCooldownHours] = useState(24);
  const [noMatchReply, setNoMatchReply] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");

  useEffect(() => {
    if (!account?.settings) return;
    setReplyDelaySeconds(account.settings.replyDelaySeconds ?? 3);
    setIsActive(account.settings.isActive ?? true);
    setBotMode(account.settings.botMode || "hybrid");
    setRequireFollow(account.settings.requireFollow ?? false);
    setFollowMessage(account.settings.followMessage || "");
    setFollowButtons(account.settings.followButtons || []);
    setFollowReminderCooldownHours(account.settings.followReminderCooldownHours ?? 24);
    setNoMatchReply(account.settings.noMatchReply || "");
    setFallbackMessage(account.settings.fallbackMessage || "");
  }, [account]);

  const activeRulesCount = account?.keywordRules?.filter((r) => r.isActive !== false).length || 0;
  const activeAiCount = account?.aiProviders?.filter((p) => p.isActive !== false && p.hasApiKey).length || 0;

  const daysLeft = account?.tokenExpiresAt
    ? Math.max(0, Math.ceil((new Date(account.tokenExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const tokenAgeMs = account?.tokenExpiresAt
    ? TOKEN_LIFETIME_MS - (new Date(account.tokenExpiresAt).getTime() - Date.now())
    : null;
  const tokenTooNew = tokenAgeMs !== null && tokenAgeMs < MIN_TOKEN_AGE_MS;
  const refreshInHours = tokenTooNew ? Math.ceil((MIN_TOKEN_AGE_MS - tokenAgeMs) / 3600000) : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshStats(); } finally { setRefreshing(false); }
  };

  const handleRefreshToken = async () => {
    if (tokenTooNew) return;
    setRefreshingToken(true);
    try { await refreshInstagramToken(); } catch { /* toast shown */ }
    finally { setRefreshingToken(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        isActive, botMode, requireFollow, followMessage, followButtons,
        followReminderCooldownHours, noMatchReply, fallbackMessage, replyDelaySeconds,
      });
    } finally { setSaving(false); }
  };

  const followerRatio = stats.totalUsers > 0
    ? Math.round((stats.followersCount / stats.totalUsers) * 100) : 0;

  return (
    <DashboardLayout title="DM Overview">
      <div className="page-head">
        <div>
          <h1 className="page-title">DM Automation Overview</h1>
          <p className="page-subtitle">
            Connected to @{account?.username || "instagram"} · Bot ID{" "}
            <span className="tabular-num">{account?.botIgId}</span>
            {daysLeft !== null && (
              <>
                {" · "}
                <span style={{
                  color: daysLeft <= 7 ? "var(--signal-danger)" : daysLeft <= 15 ? "var(--signal-warning)" : undefined,
                  fontWeight: daysLeft <= 15 ? 600 : undefined,
                }}>
                  Token valid {daysLeft}d
                </span>
              </>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={handleRefreshToken} disabled={refreshingToken || tokenTooNew}
            title={tokenTooNew
              ? `Instagram only refreshes tokens older than 24 hours. Try again in ${refreshInHours}h.`
              : "Get a fresh 60-day Instagram token"}>
            <KeyRound size={14} />
            <span>{refreshingToken ? "Refreshing..." : tokenTooNew ? `Refresh in ${refreshInHours}h` : "Refresh Token"}</span>
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} /><span>{refreshing ? "Refreshing..." : "Refresh Stats"}</span>
          </button>
          <Link to="/inbox" className="btn btn-primary btn-sm">
            <span>Open Live Inbox</span><ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <section className="kpi-grid" aria-label="Account summary metrics">
        <div className="kpi-card">
          <span className="kpi-label">Total DM Leads</span>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-num">{stats.totalUsers}</span>
            <span className="kpi-delta">{followerRatio}% followers</span>
          </div>
          <span className="kpi-foot">Unique Instagram users messaged</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Verified Followers</span>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-num">{stats.followersCount}</span>
            <span className="kpi-delta">Synced</span>
          </div>
          <span className="kpi-foot">Leads following your account</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Incoming DMs</span>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-num">{stats.incomingMessages}</span>
          </div>
          <span className="kpi-foot">Messages received by webhook</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Automated Replies</span>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-num">{stats.outgoingMessages}</span>
          </div>
          <span className="kpi-foot">Rules + AI responses sent</span>
        </div>
      </section>

      <section className="dashboard-split">
        <form onSubmit={handleSaveSettings} className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bot Controls &amp; Mode</h2>
              <p className="panel-sub">Keyword Rules, AI, or Hybrid — DM replies ka behaviour</p>
            </div>
          </div>

          <div className="toggle-setting-row">
            <div>
              <div className="field-label">Master Bot Switch</div>
              <div className="field-hint">Turn off to pause automatic replies. Messages still get recorded.</div>
            </div>
            <button type="button" role="switch" aria-checked={isActive}
              className={`switch-btn ${isActive ? "is-on" : ""}`}
              onClick={() => setIsActive((p) => !p)}>
              <span className="switch-thumb" />
            </button>
          </div>

          <div className="field-group">
            <label className="field-label">Reply Mode</label>
            <div className="segmented-tabs" style={{ width: "100%" }}>
              {[
                { id: "hybrid", label: "Hybrid (Rules + AI)" },
                { id: "rules", label: "Rules Only" },
                { id: "ai", label: "AI Only" },
              ].map((m) => (
                <button key={m.id} type="button"
                  className={`segmented-tab ${botMode === m.id ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setBotMode(m.id)}>{m.label}</button>
              ))}
            </div>
            <span className="field-hint">
              {botMode === "hybrid" && "Checks keyword rules first (0 AI cost); uses AI if no keyword matches."}
              {botMode === "rules" && "Only replies when a keyword rule matches. No AI API key needed."}
              {botMode === "ai" && "Sends every DM straight to your configured AI provider pipeline."}
            </span>
          </div>

          <div className="field-group">
            <RangeSlider label="Message Batching Wait" value={replyDelaySeconds}
              min={0} max={15} unit="sec" onChange={setReplyDelaySeconds} />
            <span className="field-hint">
              {replyDelaySeconds === 0
                ? "No wait. Each message may get its own reply. 2-3 sec is recommended."
                : `Waits ${replyDelaySeconds} sec for more messages, then sends one combined reply.`}
              {" "}AI replies take an extra 2-4 sec on top of this.
            </span>
          </div>

          <div className="toggle-setting-row">
            <div>
              <div className="field-label">Require Follow Before Replying</div>
              <div className="field-hint">Non-followers get your follow reminder instead of bot replies.</div>
            </div>
            <button type="button" role="switch" aria-checked={requireFollow}
              className={`switch-btn ${requireFollow ? "is-on" : ""}`}
              onClick={() => setRequireFollow((p) => !p)}>
              <span className="switch-thumb" />
            </button>
          </div>

          {requireFollow && (
            <>
              <div className="field-group">
                <label htmlFor="follow-msg" className="field-label">Follow Reminder Message</label>
                <input id="follow-msg" type="text" className="input-control"
                  value={followMessage} onChange={(e) => setFollowMessage(e.target.value)}
                  placeholder="Please follow first then we talk! 😊" />
              </div>
              <ButtonBuilder buttons={followButtons} onChange={setFollowButtons} label="Follow Reminder Buttons" />
              <span className="field-hint">Leave empty to auto-add a one-tap "Follow" button linking to your profile.</span>
              <div className="field-group">
                <RangeSlider label="Reminder repeat gap" value={followReminderCooldownHours}
                  min={6} max={24} step={1} unit="hrs" onChange={setFollowReminderCooldownHours} />
                <span className="field-hint">
                  One reminder, then the bot stays quiet for {followReminderCooldownHours} hours.
                  Replies resume instantly once they follow.
                </span>
              </div>
            </>
          )}

          {botMode === "rules" ? (
            <div className="field-group">
              <label htmlFor="nomatch-msg" className="field-label">No-Match Reply (Optional)</label>
              <input id="nomatch-msg" type="text" className="input-control"
                value={noMatchReply} onChange={(e) => setNoMatchReply(e.target.value)}
                placeholder='Leave blank to stay silent, or e.g. Reply "price" for rates' />
            </div>
          ) : (
            <div className="field-group">
              <label htmlFor="fallback-msg" className="field-label">AI Fallback Message (When AI API fails / missing)</label>
              <input id="fallback-msg" type="text" className="input-control"
                value={fallbackMessage} onChange={(e) => setFallbackMessage(e.target.value)} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /><span>{saving ? "Saving..." : "Save Bot Settings"}</span>
            </button>
          </div>
        </form>

        <div className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Setup Checklist</h2>
              <p className="panel-sub">Quick status of your connected modules</p>
            </div>
          </div>
          <div className="health-list">
            <div className="health-row">
              <div>
                <div className="health-row-title">Keyword Rules</div>
                <div className="health-row-sub">{activeRulesCount} active rule{activeRulesCount === 1 ? "" : "s"} configured</div>
              </div>
              <Link to="/automations" className="btn btn-secondary btn-sm">Manage</Link>
            </div>
            <div className="health-row">
              <div>
                <div className="health-row-title">AI Providers (BYOK)</div>
                <div className="health-row-sub" style={{ color: botMode !== "rules" && activeAiCount === 0 ? "var(--signal-warning)" : undefined }}>
                  {activeAiCount > 0 ? `${activeAiCount} active AI provider(s)`
                    : botMode === "rules" ? "Not needed in Rules Only mode"
                    : "Missing! Add Groq/Gemini/OpenAI key"}
                </div>
              </div>
              <Link to="/ai-studio" className="btn btn-secondary btn-sm">Configure</Link>
            </div>
            <div className="health-row">
              <div>
                <div className="health-row-title">Business Context</div>
                <div className="health-row-sub">
                  {account?.businessInfo?.description?.trim()
                    ? `Configured for ${account.businessInfo.name}`
                    : "Add business description for accurate AI replies"}
                </div>
              </div>
              <Link to="/ai-studio" className="btn btn-secondary btn-sm">Edit</Link>
            </div>
            <div className="health-row">
              <div>
                <div className="health-row-title">Live DM Inbox</div>
                <div className="health-row-sub">View all {stats.totalUsers} leads &amp; transcripts</div>
              </div>
              <Link to="/inbox" className="btn btn-secondary btn-sm">Open</Link>
            </div>
            <div className="health-row">
              <div>
                <div className="health-row-title">Comment Funnels</div>
                <div className="health-row-sub">Comment → private reply → follow check → link</div>
              </div>
              <Link to="/comments" className="btn btn-secondary btn-sm">Open</Link>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}