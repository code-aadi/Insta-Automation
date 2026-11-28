import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Heart, Images, MessageSquare, RefreshCw, Search } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function CommentMediaPage() {
  const { commentMedia, commentRules, syncCommentMedia, showToast } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const ruleCountByMedia = useMemo(() => {
    const map = {};
    for (const r of commentRules || []) {
      if (r.targetMode !== "specific") continue;
      for (const id of r.mediaIds || []) map[id] = (map[id] || 0) + 1;
    }
    return map;
  }, [commentRules]);

  const allCount = (commentRules || []).filter((r) => r.targetMode === "all").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (commentMedia || []).filter((m) => {
      const okType = type === "all" || (type === "reel" ? m.mediaType === "REEL" || m.mediaType === "VIDEO" : m.mediaType === type);
      const okQ = !q || m.caption?.toLowerCase().includes(q) || m.mediaId.includes(q);
      return okType && okQ;
    });
    if (sortBy === "comments") list = [...list].sort((a, b) => b.commentsCount - a.commentsCount);
    else if (sortBy === "likes") list = [...list].sort((a, b) => b.likeCount - a.likeCount);
    else list = [...list].sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
    return list;
  }, [commentMedia, query, type, sortBy]);

  const sync = async () => {
    setSyncing(true);
    try { await syncCommentMedia(); }
    catch (e) { showToast(e.message, "error"); }
    finally { setSyncing(false); }
  };

  return (
    <DashboardLayout title="Media Library">
      <div className="page-head">
        <div>
          <h1 className="page-title">Posts &amp; Reels Library</h1>
          <p className="page-subtitle">
            Sync your Instagram media, then attach comment funnels to specific posts.
            {allCount > 0 && ` ${allCount} funnel(s) currently target all media.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/comments" className="btn btn-secondary btn-sm">Comment Rules</Link>
          <button type="button" className="btn btn-comment" onClick={sync} disabled={syncing}>
            <RefreshCw size={15} /><span>{syncing ? "Syncing..." : "Sync from Instagram"}</span>
          </button>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-filters">
          <div className="search-box">
            <Search size={15} className="search-box-icon" />
            <input type="search" className="input-control search-input" value={query}
              onChange={(e) => setQuery(e.target.value)} placeholder="Search caption or media ID..." />
          </div>
          <div className="segmented-tabs">
            {[{ id: "all", l: "All" }, { id: "reel", l: "Reels" }, { id: "IMAGE", l: "Images" }, { id: "CAROUSEL_ALBUM", l: "Carousels" }].map((t) => (
              <button key={t.id} type="button" className={`segmented-tab ${type === t.id ? "is-active" : ""}`}
                onClick={() => setType(t.id)}>{t.l}</button>
            ))}
          </div>
          <select className="select-control" style={{ maxWidth: 180 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Sort: Newest</option>
            <option value="comments">Sort: Most comments</option>
            <option value="likes">Sort: Most likes</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state-title">
            {commentMedia.length === 0 ? "Library is empty" : "No media matches your filter"}
          </h2>
          <p className="empty-state-copy">
            Pull your latest 50 posts and reels straight from Instagram. Thumbnails, captions and
            comment counts come with them.
          </p>
          <button type="button" className="btn btn-comment" onClick={sync} disabled={syncing}>
            <RefreshCw size={15} /><span>{syncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      ) : (
        <div className="media-grid">
          {visible.map((m) => {
            const attached = ruleCountByMedia[m.mediaId] || 0;
            return (
              <article key={m.mediaId} className="media-card">
                <div className="media-card-thumb">
                  {m.thumbnailUrl
                    ? <img src={m.thumbnailUrl} alt="" loading="lazy" />
                    : <span className="media-card-fallback"><Images size={22} /></span>}
                  <span className="media-card-type">{m.mediaType}</span>
                  {attached > 0 && <span className="media-card-badge">{attached} funnel{attached === 1 ? "" : "s"}</span>}
                  {allCount > 0 && <span className="media-card-badge media-card-badge--all">+{allCount} global</span>}
                </div>
                <div className="media-card-body">
                  <p className="media-card-caption">{m.caption || "No caption"}</p>
                  <div className="media-card-metrics">
                    <span><MessageSquare size={12} /> {m.commentsCount}</span>
                    <span><Heart size={12} /> {m.likeCount}</span>
                    <span className="tabular-num">
                      {m.postedAt ? new Date(m.postedAt).toLocaleDateString([], { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </div>
                  <div className="media-card-actions">
                    <Link to="/comments" className="btn btn-secondary btn-sm">Attach funnel</Link>
                    {m.permalink && (
                      <a href={m.permalink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" aria-label="Open on Instagram">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}