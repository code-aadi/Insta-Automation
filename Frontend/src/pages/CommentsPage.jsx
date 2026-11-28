import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowUp, CheckSquare, Edit3, Gift, Images, MessageSquare,
  Plus, Search, ShieldCheck, Square, Trash2, Undo2, X, Zap,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import ButtonBuilder from "../components/ButtonBuilder.jsx";
import { useApp } from "../context/AppContext.jsx";

const STAGES = [
  { id: "private", label: "Private Reply", icon: MessageSquare, hint: "One-shot DM after the comment" },
  { id: "gate", label: "Follow Gate", icon: ShieldCheck, hint: "Shown when follow check fails" },
  { id: "reward", label: "Reward", icon: Gift, hint: "Delivered once follow is confirmed" },
];

const emptyDraft = (username) => ({
  name: "",
  targetMode: "all",
  mediaIds: [],
  matchAll: false,
  keywords: [],
  matchType: "contains",
  isActive: true,
  privateReply: {
    text: "Access chahiye? Neeche button dabao 👇",
    buttons: [{ type: "postback", title: "Send me access", payload: "SEND_ACCESS", url: "" }],
  },
  followGate: {
    text: "Pehle follow karo, phir link milega ❤️",
    profileUrl: username ? `https://www.instagram.com/${username}/` : "",
    confirmPayload: "I_AM_FOLLOWING",
  },
  reward: {
    text: "Ye lo tumhara link! 🎉",
    buttons: [{ type: "web_url", title: "Open Link", url: "", payload: "" }],
  },
});

export default function CommentsPage() {
  const {
    account, commentRules, commentMedia, createCommentRule, updateCommentRule,
    deleteCommentRule, restoreCommentRule, reorderCommentRules, bulkCommentRules, showToast,
  } = useApp();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [selected, setSelected] = useState([]);
  const [undoRule, setUndoRule] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft(account?.username));
  const [keywordDraft, setKeywordDraft] = useState("");
  const [stageTab, setStageTab] = useState("private");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!undoRule) return;
    const t = setTimeout(() => setUndoRule(null), 9000);
    return () => clearTimeout(t);
  }, [undoRule]);

  const mediaById = useMemo(
    () => Object.fromEntries((commentMedia || []).map((m) => [m.mediaId, m])),
    [commentMedia]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (commentRules || []).filter((r) => {
      const active = r.isActive !== false;
      const okStatus = status === "all" || (status === "active" && active) || (status === "paused" && !active);
      const okQuery =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        r.privateReply?.text?.toLowerCase().includes(q);
      return okStatus && okQuery;
    });
    if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "delivered") list = [...list].sort((a, b) => (b.stats?.delivered || 0) - (a.stats?.delivered || 0));
    else if (sortBy === "matched") list = [...list].sort((a, b) => (b.stats?.matched || 0) - (a.stats?.matched || 0));
    return list;
  }, [commentRules, query, status, sortBy]);

  const totals = useMemo(() => {
    const r = commentRules || [];
    return {
      active: r.filter((x) => x.isActive !== false).length,
      matched: r.reduce((s, x) => s + (x.stats?.matched || 0), 0),
      replied: r.reduce((s, x) => s + (x.stats?.replied || 0), 0),
      delivered: r.reduce((s, x) => s + (x.stats?.delivered || 0), 0),
    };
  }, [commentRules]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft(account?.username));
    setKeywordDraft(""); setStageTab("private"); setError(""); setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setDraft({
      ...emptyDraft(account?.username),
      ...rule,
      privateReply: { ...rule.privateReply, buttons: rule.privateReply?.buttons || [] },
      followGate: { ...rule.followGate },
      reward: { ...rule.reward, buttons: rule.reward?.buttons || [] },
    });
    setKeywordDraft(""); setStageTab("private"); setError(""); setModalOpen(true);
  };

  const addKeywords = () => {
    const parts = keywordDraft.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setDraft((d) => {
      const seen = new Set(d.keywords.map((k) => k.toLowerCase()));
      return { ...d, keywords: [...d.keywords, ...parts.filter((p) => !seen.has(p.toLowerCase()))] };
    });
    setKeywordDraft(""); setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    let keywords = [...draft.keywords];
    if (keywordDraft.trim()) {
      const seen = new Set(keywords.map((k) => k.toLowerCase()));
      for (const p of keywordDraft.split(",").map((s) => s.trim()).filter(Boolean))
        if (!seen.has(p.toLowerCase())) keywords.push(p);
    }
    if (!draft.name.trim()) return setError("Give this rule a name.");
    if (draft.targetMode === "specific" && draft.mediaIds.length === 0)
      return setError("Select at least one post or reel.");
    if (!draft.matchAll && keywords.length === 0)
      return setError("Add a keyword, or turn on 'Any comment'.");
    if (!draft.privateReply.text.trim()) return setError("Private reply text is required.");
    if (!draft.reward.text.trim()) return setError("Reward message text is required.");

    setError(""); setSaving(true);
    const payload = { ...draft, keywords, name: draft.name.trim() };
    try {
      if (editing) await updateCommentRule(editing._id, payload);
      else await createCommentRule(payload);
      showToast(editing ? "Comment rule updated" : "Comment rule created", "success");
      setModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const move = async (idx, dir) => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= commentRules.length) return;
    const ids = commentRules.map((r) => r._id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    try { await reorderCommentRules(ids); } catch (e) { showToast(e.message, "error"); }
  };

  const confirmDelete = async () => {
    const rule = pendingDelete;
    setPendingDelete(null);
    try {
      const removed = await deleteCommentRule(rule._id);
      setUndoRule(removed || rule);
    } catch { /* toast shown */ }
  };

  const runBulk = async (action) => {
    const ids = [...selected];
    setSelected([]);
    try {
      await bulkCommentRules(ids, action);
      showToast(`${ids.length} rule(s) ${action === "delete" ? "deleted" : action === "pause" ? "paused" : "activated"}`, "success");
    } catch (e) { showToast(e.message, "error"); }
  };

  const toggleSelect = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const previewStage = stageTab === "private" ? draft.privateReply
    : stageTab === "reward" ? draft.reward
    : {
        text: draft.followGate.text,
        buttons: [
          { type: "web_url", title: "Follow Karo ❤️", url: draft.followGate.profileUrl },
          { type: "postback", title: "I am following", payload: draft.followGate.confirmPayload },
        ],
      };

  return (
    <DashboardLayout title="Comment Rules">
      <div className="page-head">
        <div>
          <h1 className="page-title">Comment → DM Funnels</h1>
          <p className="page-subtitle">
            Pick a post or reel, set trigger keywords, and design the 3-stage private reply flow.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/comments/media" className="btn btn-secondary btn-sm">
            <Images size={14} /><span>Media Library</span>
          </Link>
          <button type="button" className="btn btn-comment" onClick={openCreate}>
            <Plus size={16} /><span>New Comment Rule</span>
          </button>
        </div>
      </div>

      <section className="kpi-grid">
        {[
          { label: "Active Funnels", value: totals.active, foot: `${commentRules.length} total rules`, tone: "comment" },
          { label: "Comments Matched", value: totals.matched, foot: "Keyword hits on your media", tone: "info" },
          { label: "Private Replies", value: totals.replied, foot: "One-shot DMs delivered", tone: "warn" },
          { label: "Links Delivered", value: totals.delivered, foot: "Follow confirmed → reward sent", tone: "ok" },
        ].map((k) => (
          <div key={k.label} className={`kpi-card kpi-card--${k.tone}`}>
            <span className="kpi-label">{k.label}</span>
            <div className="kpi-value-row"><span className="kpi-value tabular-num">{k.value}</span></div>
            <span className="kpi-foot">{k.foot}</span>
          </div>
        ))}
      </section>

      <div className="flow-legend">
        {[
          { n: "01", t: "Comment", d: "User comments your keyword", tone: "info" },
          { n: "02", t: "Private Reply", d: "One-shot DM with access button", tone: "warn" },
          { n: "03", t: "Follow Check", d: "Tap → backend verifies follow", tone: "comment" },
          { n: "04", t: "Reward", d: "Following? link sent : gate template", tone: "ok" },
        ].map((s) => (
          <div key={s.n} className={`flow-step flow-step--${s.tone}`}>
            <span className="flow-step-num">{s.n}</span>
            <span className="flow-step-title">{s.t}</span>
            <span className="flow-step-desc">{s.d}</span>
          </div>
        ))}
      </div>

      <div className="toolbar-row">
        <div className="toolbar-filters">
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
          <select className="select-control" style={{ maxWidth: 190 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="priority">Sort: Priority</option>
            <option value="name">Sort: Name</option>
            <option value="matched">Sort: Most matched</option>
            <option value="delivered">Sort: Most delivered</option>
          </select>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selected.length} selected</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => runBulk("activate")}>Activate</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => runBulk("pause")}>Pause</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => runBulk("delete")}>Delete</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state-title">
            {commentRules.length === 0 ? "No comment funnels yet" : "Nothing matches your filter"}
          </h2>
          <p className="empty-state-copy">
            Create a funnel like <strong>“link”</strong> or <strong>“access”</strong> on a specific reel.
            Anyone commenting it gets a private DM, follows you, and unlocks the link.
          </p>
          <button type="button" className="btn btn-comment" onClick={openCreate}>
            <Plus size={16} /><span>Create First Funnel</span>
          </button>
        </div>
      ) : (
        <div className="comment-rule-list">
                    {visible.map((rule) => {
            const active = rule.isActive !== false;
            const realIdx = commentRules.findIndex((r) => r._id === rule._id);
            const targets = rule.targetMode === "all"
              ? []
              : (rule.mediaIds || []).map((id) => mediaById[id]).filter(Boolean);
            const isSel = selected.includes(rule._id);

            const matched = rule.stats?.matched || 0;
            const replied = rule.stats?.replied || 0;
            const delivered = rule.stats?.delivered || 0;
            const waiting = Math.max(0, replied - delivered);
            const rate = matched > 0 ? Math.round((delivered / matched) * 100) : 0;

            const funnel = [
              { key: "c", label: "Comment", value: matched, tone: "info" },
              { key: "p", label: "Private Reply", value: replied, tone: "warn" },
              { key: "w", label: "Waiting", value: waiting, tone: "comment" },
              { key: "d", label: "Delivered", value: delivered, tone: "ok" },
            ];

            return (
              <article key={rule._id}
                className={`cr-card ${!active ? "is-paused" : ""} ${isSel ? "is-selected" : ""}`}>
                <div className="cr-head">
                  <button type="button" className="cr-check" onClick={() => toggleSelect(rule._id)}
                    aria-label={isSel ? "Deselect rule" : "Select rule"}>
                    {isSel ? <CheckSquare size={17} /> : <Square size={17} />}
                  </button>
                  <span className="cr-index tabular-num">{String(realIdx + 1).padStart(2, "0")}</span>
                  <h3 className="cr-name">{rule.name}</h3>
                  <span className={`status-text ${active ? "status-text--active" : "status-text--paused"}`}>
                    {active ? "Active" : "Paused"}
                  </span>

                  <div className="cr-controls">
                    <button type="button" className="btn btn-ghost btn-icon" disabled={realIdx === 0}
                      onClick={() => move(realIdx, "up")} aria-label="Move up"><ArrowUp size={15} /></button>
                    <button type="button" className="btn btn-ghost btn-icon" disabled={realIdx === commentRules.length - 1}
                      onClick={() => move(realIdx, "down")} aria-label="Move down"><ArrowDown size={15} /></button>
                    <button type="button" role="switch" aria-checked={active}
                      className={`switch-btn ${active ? "is-on" : ""}`}
                      onClick={() => updateCommentRule(rule._id, { isActive: !active })} aria-label="Toggle rule">
                      <span className="switch-thumb" />
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => openEdit(rule)} aria-label="Edit">
                      <Edit3 size={15} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => setPendingDelete(rule)} aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="cr-meta">
                  <span className="cr-target">
                    <Images size={13} />
                    {rule.targetMode === "all" ? (
                      <span>All posts &amp; reels</span>
                    ) : targets.length ? (
                      <>
                        {targets.slice(0, 4).map((m) => (
                          <img key={m.mediaId} src={m.thumbnailUrl} alt="" className="rule-thumb" />
                        ))}
                        <span>{targets.length} media</span>
                      </>
                    ) : (
                      <span>{rule.mediaIds.length} media</span>
                    )}
                  </span>

                  <span className="cr-divider" aria-hidden="true" />

                  <span className="cr-keywords">
                    {rule.matchAll ? (
                      <span className="keyword-token keyword-token--any"><Zap size={11} /> Any comment</span>
                    ) : (
                      rule.keywords.map((k) => <span key={k} className="keyword-token">{k}</span>)
                    )}
                  </span>

                  <span className="rule-match-type">{(rule.matchType || "contains").toUpperCase()}</span>

                  <span className="cr-divider" aria-hidden="true" />

                  <span className="stage-strip">
                    <span className="stage-pill stage-pill--warn"><MessageSquare size={11} /> {rule.privateReply?.buttons?.length || 0} btn</span>
                    <span className="stage-pill stage-pill--comment"><ShieldCheck size={11} /> Follow gate</span>
                    <span className="stage-pill stage-pill--ok"><Gift size={11} /> {rule.reward?.buttons?.length || 0} link</span>
                  </span>
                </div>

                <div className="cr-funnel">
                  {funnel.map((s, i) => (
                    <div key={s.key} className={`cr-stage cr-stage--${s.tone}`}>
                      <span className="cr-stage-value tabular-num">{s.value}</span>
                      <span className="cr-stage-label">{s.label}</span>
                      {i < funnel.length - 1 && <span className="cr-stage-arrow" aria-hidden="true">→</span>}
                    </div>
                  ))}
                  <div className="cr-rate">
                    <span className="cr-rate-value tabular-num">{rate}%</span>
                    <span className="cr-rate-label">converted</span>
                  </div>
                </div>

                <div className="cr-bar" role="img" aria-label={`${rate}% of matched comments converted`}>
                  <span className="cr-bar-fill" style={{ width: `${Math.max(rate, matched > 0 ? 3 : 0)}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {undoRule && (
        <div className="undo-bar">
          <span>Deleted “{undoRule.name}”</span>
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={async () => { const r = undoRule; setUndoRule(null); await restoreCommentRule(r); }}>
            <Undo2 size={14} /><span>Undo</span>
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setUndoRule(null)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--wide">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editing ? "Edit Comment Funnel" : "New Comment Funnel"}</h2>
                <p className="modal-subtitle">Comment → private reply → follow check → reward link.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="wizard-body-grid">
              <div className="wizard-form-col">
                <div className="field-group">
                  <label className="field-label" htmlFor="cr-name">Funnel Name</label>
                  <input id="cr-name" className="input-control" value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Reel Link Giveaway" />
                </div>

                <div className="field-group">
                  <span className="field-label">Target Media</span>
                  <div className="segmented-tabs" style={{ width: "100%" }}>
                    {[{ id: "all", l: "All posts & reels" }, { id: "specific", l: "Specific media" }].map((o) => (
                      <button key={o.id} type="button" style={{ flex: 1, justifyContent: "center" }}
                        className={`segmented-tab ${draft.targetMode === o.id ? "is-active" : ""}`}
                        onClick={() => setDraft({ ...draft, targetMode: o.id })}>{o.l}</button>
                    ))}
                  </div>
                  {draft.targetMode === "specific" && (
                    commentMedia.length === 0 ? (
                      <span className="field-hint">
                        Library empty. <Link to="/comments/media" className="inline-link">Sync your media first →</Link>
                      </span>
                    ) : (
                      <div className="media-select-grid">
                        {commentMedia.map((m) => {
                          const on = draft.mediaIds.includes(m.mediaId);
                          return (
                            <button key={m.mediaId} type="button"
                              className={`media-select-item ${on ? "is-selected" : ""}`}
                              onClick={() => setDraft({
                                ...draft,
                                mediaIds: on ? draft.mediaIds.filter((x) => x !== m.mediaId) : [...draft.mediaIds, m.mediaId],
                              })}>
                              {m.thumbnailUrl
                                ? <img src={m.thumbnailUrl} alt="" className="media-select-thumb" />
                                : <span className="media-select-thumb media-select-thumb--empty"><Images size={16} /></span>}
                              <span className="media-select-meta">
                                <span className="media-select-type">{m.mediaType}</span>
                                <span className="media-select-cap">{m.caption?.slice(0, 42) || "No caption"}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                <div className="toggle-setting-row">
                  <div>
                    <div className="field-label">Trigger on any comment</div>
                    <div className="field-hint">Ignore keywords — reply to every comment on target media.</div>
                  </div>
                  <button type="button" role="switch" aria-checked={draft.matchAll}
                    className={`switch-btn ${draft.matchAll ? "is-on" : ""}`}
                    onClick={() => setDraft({ ...draft, matchAll: !draft.matchAll })}>
                    <span className="switch-thumb" />
                  </button>
                </div>

                {!draft.matchAll && (
                  <div className="field-group">
                    <label className="field-label" htmlFor="cr-kw">Trigger Keywords</label>
                    <div className="keyword-input-row">
                      <input id="cr-kw" className="input-control" value={keywordDraft}
                        onChange={(e) => setKeywordDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeywords(); } }}
                        placeholder="e.g. link, access, template" />
                      <button type="button" className="btn btn-secondary" onClick={addKeywords}>Add</button>
                    </div>
                    {draft.keywords.length > 0 && (
                      <div className="keyword-token-list">
                        {draft.keywords.map((k) => (
                          <span key={k} className="keyword-token">{k}
                            <button type="button" className="keyword-remove-btn"
                              onClick={() => setDraft({ ...draft, keywords: draft.keywords.filter((x) => x !== k) })}
                              aria-label={`Remove ${k}`}><X size={13} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <select className="select-control" value={draft.matchType}
                      onChange={(e) => setDraft({ ...draft, matchType: e.target.value })}>
                      <option value="contains">Contains — “link please” matches</option>
                      <option value="exact">Exact — only “link” matches</option>
                    </select>
                  </div>
                )}

                <div className="stage-editor">
                  <div className="stage-tabs">
                    {STAGES.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button key={s.id} type="button"
                          className={`stage-tab stage-tab--${s.id} ${stageTab === s.id ? "is-active" : ""}`}
                          onClick={() => setStageTab(s.id)}>
                          <Icon size={14} /><span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="field-hint">{STAGES.find((s) => s.id === stageTab)?.hint}</p>

                  {stageTab === "private" && (
                    <>
                      <div className="notice notice--warn">
                        Instagram allows only <strong>one</strong> private reply per comment, within 7 days.
                        Keep this message short and put the access button here.
                      </div>
                      <div className="field-group">
                        <label className="field-label">Private Reply Text</label>
                        <textarea className="textarea-control" rows={3} value={draft.privateReply.text}
                          onChange={(e) => setDraft({ ...draft, privateReply: { ...draft.privateReply, text: e.target.value } })} />
                      </div>
                      <ButtonBuilder buttons={draft.privateReply.buttons} max={3} label="Access Buttons"
                        onChange={(b) => setDraft({ ...draft, privateReply: { ...draft.privateReply, buttons: b } })} />
                    </>
                  )}

                  {stageTab === "gate" && (
                    <>
                      <div className="field-group">
                        <label className="field-label">Follow Gate Text</label>
                        <textarea className="textarea-control" rows={3} value={draft.followGate.text}
                          onChange={(e) => setDraft({ ...draft, followGate: { ...draft.followGate, text: e.target.value } })} />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Your Profile URL (button 1)</label>
                        <input className="input-control" value={draft.followGate.profileUrl}
                          onChange={(e) => setDraft({ ...draft, followGate: { ...draft.followGate, profileUrl: e.target.value } })}
                          placeholder="https://www.instagram.com/yourhandle/" />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Confirm Payload (button 2 · “I am following”)</label>
                        <input className="input-control" value={draft.followGate.confirmPayload}
                          onChange={(e) => setDraft({ ...draft, followGate: { ...draft.followGate, confirmPayload: e.target.value } })} />
                        <span className="field-hint">
                          Tapping this re-checks follow status on the backend. Still not following → this same template again.
                        </span>
                      </div>
                    </>
                  )}

                  {stageTab === "reward" && (
                    <>
                      <div className="notice notice--ok">
                        Sent only after follow is confirmed. This is where your actual link goes.
                      </div>
                      <div className="field-group">
                        <label className="field-label">Reward Text</label>
                        <textarea className="textarea-control" rows={3} value={draft.reward.text}
                          onChange={(e) => setDraft({ ...draft, reward: { ...draft.reward, text: e.target.value } })} />
                      </div>
                      <ButtonBuilder buttons={draft.reward.buttons} max={3} label="Reward Link Buttons"
                        onChange={(b) => setDraft({ ...draft, reward: { ...draft.reward, buttons: b } })} />
                    </>
                  )}
                </div>

                <div className="toggle-setting-row">
                  <div>
                    <div className="field-label">Funnel Active</div>
                    <div className="field-hint">Pause anytime without deleting.</div>
                  </div>
                  <button type="button" role="switch" aria-checked={draft.isActive}
                    className={`switch-btn ${draft.isActive ? "is-on" : ""}`}
                    onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}>
                    <span className="switch-thumb" />
                  </button>
                </div>

                {error && <span className="field-error">{error}</span>}

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-comment" disabled={saving}>
                    {saving ? "Saving..." : editing ? "Save Changes" : "Create Funnel"}
                  </button>
                </div>
              </div>

              <aside className="wizard-preview-box">
                <div className="preview-header">
                  Instagram Preview · {STAGES.find((s) => s.id === stageTab)?.label}
                </div>
                <div className="preview-body">
                  <div className="ig-comment-card">
                    <span className="ig-comment-user">@viewer</span>
                    <span className="ig-comment-text">
                      {draft.matchAll ? "nice reel!" : draft.keywords[0] || "link"}
                    </span>
                  </div>
                  <div className="preview-arrow">↓ private DM</div>
                  <div className="preview-dm-card">
                    <div className="preview-dm-card-title">{previewStage.text || "…"}</div>
                    {(previewStage.buttons || []).filter((b) => b.title).map((b, i) => (
                      <div key={i} className={`preview-dm-card-btn ${b.type === "postback" ? "is-postback" : ""}`}>
                        {b.title}
                      </div>
                    ))}
                  </div>
                  {stageTab === "gate" && (
                    <div className="preview-branch">
                      <span className="preview-branch-line preview-branch-line--ok">following → Reward</span>
                      <span className="preview-branch-line preview-branch-line--no">not following → this again</span>
                    </div>
                  )}
                </div>
              </aside>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Delete this funnel?</h2>
                <p className="modal-subtitle">“{pendingDelete.name}” will stop replying to comments. You can undo right after.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete Funnel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}