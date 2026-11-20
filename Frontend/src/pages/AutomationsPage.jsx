import { useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function AutomationsPage() {
  const { account, addKeywordRule, updateKeywordRule, deleteKeywordRule } = useApp();
  const rules = account?.keywordRules || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [matchType, setMatchType] = useState("contains");
  const [reply, setReply] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal
  const [pendingDelete, setPendingDelete] = useState(null);

  const visibleRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      const ruleActive = rule.isActive !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && ruleActive) ||
        (statusFilter === "paused" && !ruleActive);

      const matchesSearch =
        !q ||
        rule.reply?.toLowerCase().includes(q) ||
        rule.keywords?.some((kw) => kw.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [rules, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingRule(null);
    setKeywords([]);
    setKeywordDraft("");
    setMatchType("contains");
    setReply("");
    setIsActive(true);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setKeywords(rule.keywords || []);
    setKeywordDraft("");
    setMatchType(rule.matchType || "contains");
    setReply(rule.reply || "");
    setIsActive(rule.isActive !== false);
    setFormError("");
    setModalOpen(true);
  };

  const handleAddChip = () => {
    const parts = keywordDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setKeywords((prev) => {
      const existing = new Set(prev.map((k) => k.toLowerCase()));
      const additions = parts.filter((p) => !existing.has(p.toLowerCase()));
      return [...prev, ...additions];
    });
    setKeywordDraft("");
    setFormError("");
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();

    // Agar user ne draft mein type kiya par Add dabana bhool gaya toh auto-add kar lo
    let finalKeywords = [...keywords];
    if (keywordDraft.trim()) {
      const parts = keywordDraft
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const existing = new Set(finalKeywords.map((k) => k.toLowerCase()));
      for (const p of parts) {
        if (!existing.has(p.toLowerCase())) finalKeywords.push(p);
      }
    }

    if (finalKeywords.length === 0) {
      setFormError("Add at least one trigger keyword.");
      return;
    }
    if (!reply.trim()) {
      setFormError("Reply message cannot be empty.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        keywords: finalKeywords,
        matchType,
        reply: reply.trim(),
        isActive,
      };
      if (editingRule) {
        await updateKeywordRule(editingRule._id, payload);
      } else {
        await addKeywordRule(payload);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRule = async (rule) => {
    await updateKeywordRule(rule._id, { isActive: !(rule.isActive !== false) });
  };

  return (
    <DashboardLayout title="Keyword Rules">
      <div className="page-head">
        <div>
          <h1 className="page-title">DM Keyword Rules</h1>
          <p className="page-subtitle">
            Instant fixed replies when users send matching keywords (0 AI tokens used).
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          <span>Add Keyword Rule</span>
        </button>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-filters">
          <div className="search-box">
            <Search size={15} className="search-box-icon" />
            <input
              type="search"
              className="input-control search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keyword or reply..."
              aria-label="Search keyword rules"
            />
          </div>

          <div className="segmented-tabs" role="tablist" aria-label="Filter by status">
            {[
              { id: "all", label: `All (${rules.length})` },
              { id: "active", label: "Active" },
              { id: "paused", label: "Paused" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                className={`segmented-tab ${statusFilter === tab.id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleRules.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state-title">
            {rules.length === 0 ? "No keyword rules yet" : "No rules match your filter"}
          </h2>
          <p className="empty-state-copy">
            Create rules like &ldquo;price, fees&rdquo; or &ldquo;link&rdquo; so your bot
            replies instantly without calling the AI API.
          </p>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add First Rule</span>
          </button>
        </div>
      ) : (
        <div className="automation-list">
          {visibleRules.map((rule) => {
            const ruleActive = rule.isActive !== false;
            return (
              <article
                key={rule._id}
                className={`automation-row ${!ruleActive ? "is-paused" : ""}`}
              >
                <div className="automation-info">
                  <div className="keyword-token-list">
                    {(rule.keywords || []).map((kw) => (
                      <span key={kw} className="keyword-token">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="automation-meta">
                    <span>Match: {(rule.matchType || "contains").toUpperCase()}</span>
                  </div>
                </div>

                <div className="automation-reply-preview">
                  <p className="reply-snippet">{rule.reply}</p>
                </div>

                <div className="automation-controls">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ruleActive}
                    className={`switch-btn ${ruleActive ? "is-on" : ""}`}
                    onClick={() => handleToggleRule(rule)}
                    aria-label="Toggle rule"
                  >
                    <span className="switch-thumb" />
                  </button>
                  <span
                    className={`status-text ${
                      ruleActive ? "status-text--active" : "status-text--paused"
                    }`}
                  >
                    {ruleActive ? "Active" : "Paused"}
                  </span>

                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => openEditModal(rule)}
                    aria-label="Edit rule"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setPendingDelete(rule)}
                    aria-label="Delete rule"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingRule ? "Edit Keyword Rule" : "Add Keyword Rule"}
                </h2>
                <p className="modal-subtitle">
                  Trigger an exact reply whenever a user sends one of these keywords.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="wizard-form-col">
              <div className="field-group">
                <label htmlFor="kw-input" className="field-label">
                  Trigger Keywords (comma or Enter)
                </label>
                <div className="keyword-input-row">
                  <input
                    id="kw-input"
                    type="text"
                    className="input-control"
                    value={keywordDraft}
                    onChange={(e) => setKeywordDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChip();
                      }
                    }}
                    placeholder="e.g. price, fees, rate"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddChip}
                  >
                    Add
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="keyword-token-list">
                    {keywords.map((kw) => (
                      <span key={kw} className="keyword-token">
                        {kw}
                        <button
                          type="button"
                          className="keyword-remove-btn"
                          onClick={() =>
                            setKeywords((prev) => prev.filter((item) => item !== kw))
                          }
                          aria-label={`Remove ${kw}`}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="match-type" className="field-label">
                  Match Type
                </label>
                <select
                  id="match-type"
                  className="select-control"
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                >
                  <option value="contains">Contains (e.g. &ldquo;price kya hai?&rdquo;)</option>
                  <option value="exact">Exact match only (best for &ldquo;hi&rdquo;, &ldquo;1&rdquo;)</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="rule-reply" className="field-label">
                  Auto-Reply Message
                </label>
                <textarea
                  id="rule-reply"
                  className="textarea-control"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write the exact DM reply to send..."
                />
              </div>

              <div className="toggle-setting-row">
                <div>
                  <div className="field-label">Rule Active</div>
                  <div className="field-hint">Pause anytime without deleting the rule.</div>
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

              {formError && <span className="field-error">{formError}</span>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Delete Keyword Rule?</h2>
                <p className="modal-subtitle">
                  This will remove keywords: {(pendingDelete.keywords || []).join(", ")}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await deleteKeywordRule(pendingDelete._id);
                  setPendingDelete(null);
                }}
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}