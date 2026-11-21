import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;

function getInitials(user) {
  const label = user?.name || user?.username || "IG";
  return label.slice(0, 2).toUpperCase();
}

// Us din ka 00:00 timestamp (sirf date compare karne ke liye)
function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgo(value) {
  return Math.round((startOfDay(Date.now()) - startOfDay(value)) / DAY_MS);
}

function formatClock(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "18 Nov" (is saal) ya "18 Nov 2025" (purane saal)
function formatDate(value) {
  const d = new Date(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatDayLabel(value) {
  const diff = daysAgo(value);
  if (diff === 0) return "Aaj";
  if (diff === 1) return "Kal";
  return formatDate(value);
}

// Chat bubble meta
function formatMessageTime(value) {
  if (!value) return "";
  const clock = formatClock(value);
  return daysAgo(value) === 0 ? clock : `${formatDayLabel(value)} ${clock}`;
}

// Lead list ka compact time
function formatLeadTime(value) {
  if (!value) return "";
  return daysAgo(value) === 0 ? formatClock(value) : formatDayLabel(value);
}

export default function InboxPage() {
  const { fetchLeads, fetchLeadMessages, showToast } = useApp();

  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [followTab, setFollowTab] = useState("all");

  const chatEndRef = useRef(null);
  const prevMsgCountRef = useRef(0);

  const loadLeads = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingLeads(true);
      try {
        const data = await fetchLeads(1, 50);
        const list = data.users || [];
        setLeads(list);
        setSelectedId((prev) => prev || list[0]?.instagramId || "");
      } catch (err) {
        if (!silent) showToast(err.message, "error");
      } finally {
        if (!silent) setLoadingLeads(false);
      }
    },
    [fetchLeads, showToast]
  );

  const loadMessages = useCallback(
    async (instagramId, silent = false) => {
      if (!instagramId) return;
      if (!silent) setLoadingMsgs(true);
      try {
        const data = await fetchLeadMessages(instagramId);
        setMessages(data.messages || []);
      } catch (err) {
        if (!silent) showToast(err.message, "error");
      } finally {
        if (!silent) setLoadingMsgs(false);
      }
    },
    [fetchLeadMessages, showToast]
  );

  // Initial load
  useEffect(() => {
    loadLeads(false);
  }, [loadLeads]);

  // Selected lead badalne par messages load karo
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    prevMsgCountRef.current = 0;
    loadMessages(selectedId, false);
  }, [selectedId, loadMessages]);

  // Smart Polling: har 5 sec mein silent refresh (sirf jab tab visible ho)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadLeads(true);
      if (selectedId) loadMessages(selectedId, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedId, loadLeads, loadMessages]);

  // Naya message aane par neeche smooth scroll
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return leads.filter((user) => {
      const matchesTab =
        followTab === "all" ||
        (followTab === "followers" && user.isFollowing) ||
        (followTab === "nonfollowers" && !user.isFollowing);

      const matchesSearch =
        !q ||
        user.username?.toLowerCase().includes(q) ||
        user.name?.toLowerCase().includes(q) ||
        user.instagramId?.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [leads, followTab, searchTerm]);

  const activeLead =
    leads.find((u) => u.instagramId === selectedId) || filteredLeads[0] || null;

  return (
    <DashboardLayout title="Live Inbox">
      <div className="page-head">
        <div>
          <h1 className="page-title">Live Instagram Inbox</h1>
          <p className="page-subtitle">
            Auto-syncing leads and DM transcripts from MongoDB every 5 seconds.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            loadLeads(false);
            if (selectedId) loadMessages(selectedId, false);
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh Now</span>
        </button>
      </div>

      <div className="inbox-layout">
        {/* Left Leads List */}
        <aside className="inbox-sidebar" aria-label="DM Leads">
          <div className="inbox-sidebar-head">
            <div className="search-box" style={{ maxWidth: "100%" }}>
              <Search size={15} className="search-box-icon" />
              <input
                type="search"
                className="input-control search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or @username..."
                aria-label="Search leads"
              />
            </div>

            <div
              className="segmented-tabs"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              {[
                { id: "all", label: "All" },
                { id: "followers", label: "Followers" },
                { id: "nonfollowers", label: "Non-Followers" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`segmented-tab ${followTab === tab.id ? "is-active" : ""}`}
                  style={{ flex: 1, justifyContent: "center", padding: "4px 6px" }}
                  onClick={() => setFollowTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="inbox-thread-list">
            {loadingLeads ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Loading leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                No DM leads found yet.
              </div>
            ) : (
              filteredLeads.map((user) => {
                const isSelected = activeLead?.instagramId === user.instagramId;
                return (
                  <button
                    key={user.instagramId}
                    type="button"
                    className={`thread-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(user.instagramId)}
                  >
                    <div className="thread-avatar">{getInitials(user)}</div>
                    <div className="thread-body">
                      <div className="thread-top">
                        <span className="thread-name">
                          {user.username ? `@${user.username}` : user.name || user.instagramId}
                        </span>
                       <span className="thread-time">{formatLeadTime(user.lastMessageAt)}</span>
                      </div>
                      <span className="thread-preview">
                        {user.name || `IG ID: ${user.instagramId}`}
                      </span>
                      <span className="thread-meta">
                        {user.isFollowing ? "Following ✓" : "Not following"}
                        {user.followerCount ? ` · ${user.followerCount} followers` : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Chat Transcript Pane */}
        <section className="inbox-chat-pane" aria-label="Conversation transcript">
          {!activeLead ? (
            <div className="empty-state" style={{ margin: 24 }}>
              <h2 className="empty-state-title">No conversation selected</h2>
              <p className="empty-state-copy">
                Once someone DMs your Instagram account, their profile and full chat history
                will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-user-meta">
                  <span className="chat-user-name">
                    {activeLead.name || "Instagram User"} ·{" "}
                    {activeLead.username ? `@${activeLead.username}` : activeLead.instagramId}
                  </span>
                  <span className="chat-user-sub">
                    {activeLead.isFollowing ? "Following your account" : "Not following yet"} ·
                    IG ID: <span className="tabular-num">{activeLead.instagramId}</span>
                  </span>
                </div>
              </div>

              <div className="chat-messages">
                {loadingMsgs ? (
                  <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    No messages recorded yet.
                  </div>
                ) : (
                 messages.map((msg, idx) => {
  const isIncoming = msg.direction === "incoming";
  const prev = messages[idx - 1];
  const showDaySeparator =
    !prev || startOfDay(prev.timestamp) !== startOfDay(msg.timestamp);

  return (
    <Fragment key={msg._id}>
      {showDaySeparator && (
        <div className="chat-day-separator">
          <span>{formatDayLabel(msg.timestamp)}</span>
        </div>
      )}
      <div
        className={`chat-msg ${
          isIncoming ? "chat-msg--incoming" : "chat-msg--outgoing"
        }`}
      >
        <div className="chat-msg-bubble">
          <div>{msg.text || `[${msg.messageType}]`}</div>
        </div>
        <span className="chat-msg-meta">
          {isIncoming ? (
            `User · ${formatMessageTime(msg.timestamp)}`
          ) : (
            <>
              Bot ({msg.status})
              {msg.replySource === "rule" && " · ⚡ Keyword Rule"}
              {msg.replySource === "fallback" && " · Fallback"}
              {msg.replySource === "ai" && msg.aiMeta?.model && (
                <>
                  {` · 🤖 ${msg.aiMeta.model}`}
                  {` · ${msg.aiMeta.totalTokens} tokens (in: ${msg.aiMeta.promptTokens}, out: ${msg.aiMeta.completionTokens})`}
                </>
              )}
              {` · ${formatMessageTime(msg.timestamp)}`}
            </>
          )}
        </span>
      </div>
    </Fragment>
  );
})
                )}
                <div ref={chatEndRef} />
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}