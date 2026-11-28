import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

const STAGE_META = {
  matched:         { label: "Matched",         tone: "info" },
  private_replied: { label: "Private replied", tone: "warn" },
  awaiting_follow: { label: "Awaiting follow", tone: "comment" },
  delivered:       { label: "Link delivered",  tone: "ok" },
  denied:          { label: "Not following",   tone: "danger" },
  failed:          { label: "Failed",          tone: "danger" },
};

function clock(v) {
  if (!v) return "—";
  const d = new Date(v);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const then = new Date(v); then.setHours(0, 0, 0, 0);
  const diff = Math.round((today - then) / 86400000);
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return t;
  if (diff === 1) return `Kal ${t}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${t}`;
}

export default function CommentActivityPage() {
  const { commentActivity, refreshCommentActivity, commentMedia, showToast } = useApp();
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);

  const load = async (s = stage, silent = false) => {
    if (!silent) setLoading(true);
    try { await refreshCommentActivity(s); }
    catch (e) { if (!silent) showToast(e.message, "error"); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load("all"); }, []);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(stage, true); }, 6000);
    return () => clearInterval(t);
  }, [stage]);

  const mediaById = useMemo(
    () => Object.fromEntries((commentMedia || []).map((m) => [m.mediaId, m])),
    [commentMedia]
  );

  const events = commentActivity.events || [];
  const byStage = commentActivity.byStage || {};

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      e.fromUsername?.toLowerCase().includes(q) ||
      e.text?.toLowerCase().includes(q) ||
      e.ruleName?.toLowerCase().includes(q)
    );
  }, [events, query]);

  const timeline = (e) => [
    { l: "Comment received", at: e.timestamp, done: true },
    { l: "Private reply sent", at: e.privateReplyAt, done: !!e.privateReplyAt },
    { l: "Access button tapped", at: e.confirmAt, done: !!e.confirmAt },
    { l: "Reward delivered", at: e.deliveredAt, done: !!e.deliveredAt },
  ];

  return (
    <DashboardLayout title="Comment Activity">
      <div className="page-head">
        <div>
          <h1 className="page-title">Comment Funnel Activity</h1>
          <p className="page-subtitle">Every comment, private reply and follow check — live from your database.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => load(stage)}>
          <RefreshCw size={14} /><span>Refresh</span>
        </button>
      </div>

      <section className="kpi-grid">
        {[
          { k: "all", label: "Total Comments", v: commentActivity.total || 0, tone: "comment" },
          { k: "private_replied", label: "Private Replies", v: byStage.private_replied || 0, tone: "warn" },
          { k: "awaiting_follow", label: "Awaiting Follow", v: byStage.awaiting_follow || 0, tone: "info" },
          { k: "delivered", label: "Links Delivered", v: byStage.delivered || 0, tone: "ok" },
        ].map((c) => (
          <button key={c.k} type="button" className={`kpi-card kpi-card--${c.tone} kpi-card--clickable ${stage === c.k ? "is-active" : ""}`}
            onClick={() => { setStage(c.k); load(c.k); }}>
            <span className="kpi-label">{c.label}</span>
            <div className="kpi-value-row"><span className="kpi-value tabular-num">{c.v}</span></div>
            <span className="kpi-foot">{stage === c.k ? "Filtering by this stage" : "Click to filter"}</span>
          </button>
        ))}
      </section>

           <div className="cr-toolbar">
        <div className="search-box">
          <Search size={15} className="search-box-icon" />
          <input type="search" className="input-control search-input" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder="Search name, keyword or reply..." />
        </div>
        <div className="segmented-tabs">
          {[
            { id: "all", label: `All (${commentRules.length})` },
            { id: "active", label: "Active" },
            { id: "paused", label: "Paused" },
          ].map((t) => (
            <button key={t.id} type="button" className={`segmented-tab ${status === t.id ? "is-active" : ""}`}
              onClick={() => setStatus(t.id)}>{t.label}</button>
          ))}
        </div>
        <select className="select-control cr-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="priority">Sort: Priority</option>
          <option value="name">Sort: Name</option>
          <option value="matched">Sort: Most matched</option>
          <option value="delivered">Sort: Most delivered</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><p className="empty-state-copy">Loading activity…</p></div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state-title">No comment activity yet</h2>
          <p className="empty-state-copy">
            Once the comments webhook is connected, every trigger and follow check will stream in here.
            Your funnel rules are ready and waiting.
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {visible.map((e) => {
            const meta = STAGE_META[e.stage] || STAGE_META.matched;
            const m = mediaById[e.mediaId];
            return (
              <button key={e._id} type="button" className="activity-row" onClick={() => setDrawer(e)}>
                {m?.thumbnailUrl
                  ? <img src={m.thumbnailUrl} alt="" className="activity-thumb" />
                  : <span className="activity-thumb activity-thumb--empty" />}
                <div className="activity-main">
                  <div className="activity-top">
                    <span className="activity-user">@{e.fromUsername || e.fromId || "viewer"}</span>
                    <span className={`stage-pill stage-pill--${meta.tone}`}>{meta.label}</span>
                  </div>
                  <p className="activity-text">{e.text}</p>
                  <span className="activity-meta">{e.ruleName || "No rule"} · {clock(e.timestamp)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {drawer && (
        <div className="drawer-scrim" onClick={() => setDrawer(null)}>
          <aside className="drawer-panel" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">@{drawer.fromUsername || drawer.fromId}</h2>
                <p className="modal-subtitle">{drawer.ruleName || "No rule matched"}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDrawer(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="drawer-comment">
              <span className="ig-comment-user">commented</span>
              <p>{drawer.text}</p>
            </div>
            <div className="drawer-timeline">
              {timeline(drawer).map((s) => (
                <div key={s.l} className={`drawer-step ${s.done ? "is-done" : ""}`}>
                  <span className="drawer-dot" />
                  <span className="drawer-step-label">{s.l}</span>
                  <span className="drawer-step-time tabular-num">{s.done ? clock(s.at) : "pending"}</span>
                </div>
              ))}
            </div>
            {drawer.denyCount > 0 && (
              <div className="notice notice--danger">
                Follow check failed {drawer.denyCount} time(s) — gate template was re-sent.
              </div>
            )}
          </aside>
        </div>
      )}
    </DashboardLayout>
  );
}