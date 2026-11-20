import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Save } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";
import RangeSlider from "../components/RangeSlider.jsx";

export default function DashboardPage() {
  const { account, stats, refreshStats, updateSettings } = useApp();

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
const [replyDelaySeconds, setReplyDelaySeconds] = useState(3)
  const [isActive, setIsActive] = useState(true);
  const [botMode, setBotMode] = useState("hybrid");
  const [requireFollow, setRequireFollow] = useState(true);
  const [followMessage, setFollowMessage] = useState("");
  const [noMatchReply, setNoMatchReply] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");

  // Account load/update hone par local form sync karo
  useEffect(() => {
    console.log(account?.settings)
    if (!account?.settings) return;
    setReplyDelaySeconds(account.settings.replyDelaySeconds ?? 3)
    setIsActive(account.settings.isActive ?? true);
    setBotMode(account.settings.botMode || "hybrid");
    setRequireFollow(account.settings.requireFollow ?? true);
    setFollowMessage(account.settings.followMessage || "");
    setNoMatchReply(account.settings.noMatchReply || "");
    setFallbackMessage(account.settings.fallbackMessage || "");
  }, [account]);

  const activeRulesCount =
    account?.keywordRules?.filter((r) => r.isActive !== false).length || 0;
  const activeAiCount =
    account?.aiProviders?.filter((p) => p.isActive !== false && p.hasApiKey).length || 0;

  const daysLeft = account?.tokenExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(account.tokenExpiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStats();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        isActive,
        botMode,
        requireFollow,
        followMessage,
        noMatchReply,
        fallbackMessage,
        replyDelaySeconds
      });
    } finally {
      setSaving(false);
    }
  };

  const followerRatio =
    stats.totalUsers > 0
      ? Math.round((stats.followersCount / stats.totalUsers) * 100)
      : 0;

  return (
    <DashboardLayout title="Overview">
      <div className="page-head">
        <div>
          <h1 className="page-title">Automation Overview</h1>
          <p className="page-subtitle">
            Connected to @{account?.username || "instagram"} · Bot ID{" "}
            <span className="tabular-num">{account?.botIgId}</span>
            {daysLeft !== null ? ` · Token valid ${daysLeft}d` : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} />
            <span>{refreshing ? "Refreshing..." : "Refresh Stats"}</span>
          </button>
          <Link to="/inbox" className="btn btn-primary btn-sm">
            <span>Open Live Inbox</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4 Real KPI Cards */}
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
        {/* Left: Bot Settings & Mode Control */}
        <form onSubmit={handleSaveSettings} className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bot Controls &amp; Mode</h2>
              <p className="panel-sub">
                Control whether your bot uses Keyword Rules, AI, or Hybrid mode
              </p>
            </div>
          </div>

          <div className="toggle-setting-row">
            <div>
              <div className="field-label">Master Bot Switch</div>
              <div className="field-hint">
                Turn off anytime to pause all automatic replies for @{account?.username}.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              className={`switch-btn ${isActive ? "is-on" : ""}`}
              onClick={() => setIsActive((prev) => !prev)}
            >
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
                <button
                  key={m.id}
                  type="button"
                  className={`segmented-tab ${botMode === m.id ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setBotMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="field-hint">
              {botMode === "hybrid" &&
                "Checks keyword rules first (0 AI cost); uses AI if no keyword matches."}
              {botMode === "rules" &&
                "Only replies when a keyword rule matches. No AI API key needed."}
              {botMode === "ai" &&
                "Sends every DM straight to your configured AI provider pipeline."}
            </span>
          </div>
  <RangeSlider label="DM reply delay" value={replyDelaySeconds} min={0} max={15} unit="sec" onChange={setReplyDelaySeconds}/>
          <div className="toggle-setting-row">
            <div>
              <div className="field-label">Require Follow Before Replying</div>
              <div className="field-hint">
                Non-followers receive your follow reminder instead of bot replies.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireFollow}
              className={`switch-btn ${requireFollow ? "is-on" : ""}`}
              onClick={() => setRequireFollow((prev) => !prev)}
            >
              <span className="switch-thumb" />
            </button>
          </div>

          {requireFollow && (
            <div className="field-group">
              <label htmlFor="follow-msg" className="field-label">
                Follow Reminder Message
              </label>
              <input
                id="follow-msg"
                type="text"
                className="input-control"
                value={followMessage}
                onChange={(e) => setFollowMessage(e.target.value)}
                placeholder="Please follow first then we talk! 😊"
              />
            </div>
          )}

          {botMode === "rules" ? (
            <div className="field-group">
              <label htmlFor="nomatch-msg" className="field-label">
                No-Match Reply (Optional)
              </label>
              <input
                id="nomatch-msg"
                type="text"
                className="input-control"
                value={noMatchReply}
                onChange={(e) => setNoMatchReply(e.target.value)}
                placeholder='Leave blank to stay silent, or e.g. Reply "price" for rates'
              />
            </div>
          ) : (
            <div className="field-group">
              <label htmlFor="fallback-msg" className="field-label">
                AI Fallback Message (When AI API fails / missing)
              </label>
              <input
                id="fallback-msg"
                type="text"
                className="input-control"
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? "Saving..." : "Save Bot Settings"}</span>
            </button>
          </div>
        </form>

        {/* Right: Setup Checklist & Quick Links */}
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
                <div className="health-row-sub">
                  {activeRulesCount} active rule{activeRulesCount === 1 ? "" : "s"} configured
                </div>
              </div>
              <Link to="/automations" className="btn btn-secondary btn-sm">
                Manage
              </Link>
            </div>

            <div className="health-row">
              <div>
                <div className="health-row-title">AI Providers (BYOK)</div>
                <div
                  className="health-row-sub"
                  style={{
                    color:
                      botMode !== "rules" && activeAiCount === 0
                        ? "var(--signal-warning)"
                        : undefined,
                  }}
                >
                  {activeAiCount > 0
                    ? `${activeAiCount} active AI provider(s)`
                    : botMode === "rules"
                      ? "Not needed in Rules Only mode"
                      : "Missing! Add Groq/Gemini/OpenAI key"}
                </div>
              </div>
              <Link to="/ai-studio" className="btn btn-secondary btn-sm">
                Configure
              </Link>
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
              <Link to="/ai-studio" className="btn btn-secondary btn-sm">
                Edit
              </Link>
            </div>

            <div className="health-row">
              <div>
                <div className="health-row-title">Live DM Inbox</div>
                <div className="health-row-sub">
                  View all {stats.totalUsers} leads &amp; transcripts
                </div>
              </div>
              <Link to="/inbox" className="btn btn-secondary btn-sm">
                Open
              </Link>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}