import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function AiSettingsPage() {
const { account, updateBusinessInfo, addAiProvider, updateAiProvider, deleteAiProvider, fetchProviderModels, reorderAiProviders } = useApp();
  // Business Info form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [savingBiz, setSavingBiz] = useState(false);

  // New AI Provider form state
  const [provider, setProvider] = useState("groq");
  const [baseURL, setBaseURL] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelsInput, setModelsInput] = useState("");
  const [addingProvider, setAddingProvider] = useState(false);
  const [providerError, setProviderError] = useState("");

  const [availableModels, setAvailableModels] = useState([]);
const [selectedModels, setSelectedModels] = useState([]);
const [fetchingModels, setFetchingModels] = useState(false);
const [modelsError, setModelsError] = useState("");
const [showManualModels, setShowManualModels] = useState(false);

  useEffect(() => {
    if (!account?.businessInfo) return;
    setName(account.businessInfo.name || "");
    setDescription(account.businessInfo.description || "");
    setCustomInstructions(account.businessInfo.customInstructions || "");
    setCustomSystemPrompt(account.businessInfo.customSystemPrompt || "");
  }, [account]);

  const handleSaveBusinessInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingBiz(true);
    try {
      await updateBusinessInfo({
        name: name.trim(),
        description,
        customInstructions,
        customSystemPrompt,
      });
    } finally {
      setSavingBiz(false);
    }
  };

  const handleAddProvider = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setProviderError("API Key is required.");
      return;
    }
    if (provider === "custom" && !baseURL.trim()) {
      setProviderError("Base URL is required for custom provider.");
      return;
    }

    setProviderError("");
    setAddingProvider(true);
    try {
    const manualModels = modelsInput.split(",").map((m) => m.trim()).filter(Boolean);
const models = [...new Set([...selectedModels, ...manualModels])];

      await addAiProvider({
        provider,
        baseURL: provider === "custom" ? baseURL.trim() : undefined,
        apiKey: apiKey.trim(),
        models,
      });

      setApiKey("");
      setBaseURL("");
      setModelsInput("");
      setAvailableModels([]);
setSelectedModels([]);
    } catch (err) {
      setProviderError(err.message);
    } finally {
      setAddingProvider(false);
    }
  };


  // Provider/key/URL badle toh purani list invalid
useEffect(() => {
  setAvailableModels([]);
  setSelectedModels([]);
  setModelsError("");
}, [provider, apiKey, baseURL]);

const handleFetchModels = async () => {
  if (!apiKey.trim()) {
    setModelsError("Pehle API key paste karo.");
    return;
  }
  if (provider === "custom" && !baseURL.trim()) {
    setModelsError("Custom provider ke liye Base URL zaroori hai.");
    return;
  }
  setFetchingModels(true);
  setModelsError("");
  try {
    const models = await fetchProviderModels({
      provider,
      baseURL: provider === "custom" ? baseURL.trim() : undefined,
      apiKey: apiKey.trim(),
    });
    if (models.length === 0) {
      setModelsError("Koi chat model nahi mila — manually type kar sakte ho.");
    }
    setAvailableModels(models);
    setSelectedModels([]);
  } catch (err) {
    setModelsError(err.message);
    setAvailableModels([]);
  } finally {
    setFetchingModels(false);
  }
};
const handleMoveProvider = async (idx, direction) => {
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= providers.length) return;
  const ids = providers.map((p) => p._id);
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  try {
    await reorderAiProviders(ids);
  } catch {
    /* toast already dikha diya */
  }
};
const toggleModel = (id) => {
  setSelectedModels((prev) =>
    prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
  );
};

  const providers = account?.aiProviders || [];

  return (
    <DashboardLayout title="Business & AI">
      <div className="page-head">
        <div>
          <h1 className="page-title">Business Info &amp; AI Providers (BYOK)</h1>
          <p className="page-subtitle">
            Teach your AI assistant about your business and connect your own AI API keys.
          </p>
        </div>
      </div>

      <div className="studio-grid">
        {/* Left: Business Info Form */}
        <form onSubmit={handleSaveBusinessInfo} className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Business Context</h2>
              <p className="panel-sub">
                AI strictly answers using only the details you provide here
              </p>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="biz-name" className="field-label">
              Business / Creator Name
            </label>
            <input
              id="biz-name"
              type="text"
              className="input-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aditya Studio / Rahul's Gym"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="biz-desc" className="field-label">
              Business Description (Services, Pricing, Contact Info, FAQs)
            </label>
            <textarea
              id="biz-desc"
              className="textarea-control"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your business, plans/pricing, timings, email, or main Instagram ID..."
            />
          </div>

          <div className="field-group">
            <label htmlFor="biz-inst" className="field-label">
              Extra Client Instructions (Optional)
            </label>
            <textarea
              id="biz-inst"
              className="textarea-control"
              rows={2}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Always reply in formal English only, or promote our free trial link."
            />
          </div>

          <div className="field-group">
            <label htmlFor="biz-sys" className="field-label">
              Full Custom System Prompt Override (Advanced / Optional)
            </label>
            <textarea
              id="biz-sys"
              className="textarea-control"
              rows={3}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Leave blank to use the built-in Hinglish/English DM template. Fill only if you want 100% custom prompt control."
            />
          </div>
<span className="field-hint">
 Business info and user name are still added automatically. The default rules
  (truthful answers, short replies, no adult or political topics) are not — write
  them in your prompt.
</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={savingBiz}>
              <Save size={15} />
              <span>{savingBiz ? "Saving..." : "Save Business Info"}</span>
            </button>
          </div>
        </form>

        {/* Right: BYOK AI Providers */}
        <div className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Your AI Providers ({providers.length})</h2>
              <p className="panel-sub">
                Tried in order from top to bottom (automatic fallback if one fails)
              </p>
            </div>
          </div>

          <div className="icebreaker-list">
            {providers.length === 0 ? (
              <p className="field-hint">
                No AI providers added yet. Add your Groq, Gemini, OpenAI, or OpenRouter key below.
              </p>
            ) : (
              providers.map((item, idx) => {
  const active = item.isActive !== false;
  return (
    <div key={item._id} className="icebreaker-card">
      <div className="icebreaker-top">
        <div>
          <div className="icebreaker-question">
            {String(idx + 1).padStart(2, "0")}. {item.provider.toUpperCase()}
          </div>
          <div className="field-hint">
            {item.hasApiKey ? "API Key Encrypted ✓" : "Missing key"}
            {item.baseURL ? ` · ${item.baseURL}` : ""}
          </div>
        </div>
        <div className="icebreaker-actions" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            disabled={idx === 0}
            onClick={() => handleMoveProvider(idx, "up")}
            aria-label="Move provider up"
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            disabled={idx === providers.length - 1}
            onClick={() => handleMoveProvider(idx, "down")}
            aria-label="Move provider down"
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            className={`switch-btn ${active ? "is-on" : ""}`}
            onClick={() => updateAiProvider(item._id, { isActive: !active })}
            aria-label={`Toggle ${item.provider}`}
          >
            <span className="switch-thumb" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => deleteAiProvider(item._id)}
            aria-label={`Delete ${item.provider}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="keyword-token-list">
        {item.models?.length > 0 ? (
          item.models.map((m) => (
            <span key={m} className="keyword-token">
              {m}
            </span>
          ))
        ) : (
          <span className="field-hint">
            Using default {item.provider} fallback models
          </span>
        )}
      </div>
    </div>
  );
})
            )}
          </div>

          <form
            onSubmit={handleAddProvider}
            className="wizard-form-col"
            style={{ paddingTop: 14, borderTop: "1px solid var(--border-hairline)" }}
          >
            <h3 className="panel-title">Add AI Provider Key</h3>

            <div className="field-group">
              <label htmlFor="ai-provider" className="field-label">
                Provider
              </label>
              <select
                id="ai-provider"
                className="select-control"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="groq">Groq (Fast &amp; Free Tier)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom (OpenAI-Compatible URL)</option>
              </select>
            </div>

            {provider === "custom" && (
              <div className="field-group">
                <label htmlFor="ai-baseurl" className="field-label">
                  Base URL
                </label>
                <input
                  id="ai-baseurl"
                  type="url"
                  className="input-control"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                />
              </div>
            )}

                  <div className="field-group">
          <label htmlFor="ai-apikey" className="field-label">
            API Key (Encrypted before saving)
          </label>
          <input
            id="ai-apikey"
            type="password"
            className="input-control"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your API key..."
          />
        </div>

        {/* 🆕 Fetch Models + checkbox picker */}
        <div className="field-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleFetchModels}
            disabled={fetchingModels}
            style={{ alignSelf: "flex-start" }}
          >
            <RefreshCw size={14} />
            <span>{fetchingModels ? "Fetching models..." : "Fetch Available Models"}</span>
          </button>

          {modelsError && <span className="field-error">{modelsError}</span>}

          {availableModels.length > 0 && (
            <>
              <span className="field-hint">
                {availableModels.length} models mile · {selectedModels.length} selected ·
                select order = fallback order
              </span>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  backgroundColor: "var(--bg-subtle)",
                }}
              >
                {availableModels.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.id)}
                      onChange={() => toggleModel(m.id)}
                    />
                    <span className="tabular-num">{m.id}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

               <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowManualModels((p) => !p)}
          style={{ alignSelf: "flex-start", minHeight: "auto", padding: "2px 0" }}
        >
          <span style={{ fontSize: 12 }}>
            {showManualModels ? "− Hide manual models" : "+ Model manually add karo (advanced)"}
          </span>
        </button>

        {showManualModels && (
          <div className="field-group">
            <label htmlFor="ai-models" className="field-label">
              Extra Models (comma-separated)
            </label>
            <input
              id="ai-models"
              type="text"
              className="input-control"
              value={modelsInput}
              onChange={(e) => setModelsInput(e.target.value)}
              placeholder="e.g. llama-3.3-70b-versatile"
            />
            <span className="field-hint">
              List mein model missing hai, ya provider /models support nahi karta? Yahan ID
              type karo — checkbox wale models ke saath add ho jayenge.
            </span>
          </div>
        )}
            {providerError && <span className="field-error">{providerError}</span>}

            <div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={addingProvider}
              >
                <Plus size={15} />
                <span>{addingProvider ? "Encrypting & Saving..." : "Add Provider"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}