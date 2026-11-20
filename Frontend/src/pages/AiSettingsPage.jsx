import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function AiSettingsPage() {
  const {
    account,
    updateBusinessInfo,
    addAiProvider,
    updateAiProvider,
    deleteAiProvider,
  } = useApp();

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
      const models = modelsInput
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      await addAiProvider({
        provider,
        baseURL: provider === "custom" ? baseURL.trim() : undefined,
        apiKey: apiKey.trim(),
        models,
      });

      setApiKey("");
      setBaseURL("");
      setModelsInput("");
    } catch (err) {
      setProviderError(err.message);
    } finally {
      setAddingProvider(false);
    }
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
                          0{idx + 1}. {item.provider.toUpperCase()}
                        </div>
                        <div className="field-hint">
                          {item.hasApiKey ? "API Key Encrypted ✓" : "Missing key"}
                          {item.baseURL ? ` · ${item.baseURL}` : ""}
                        </div>
                      </div>

                      <div className="icebreaker-actions" style={{ gap: 8 }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={active}
                          className={`switch-btn ${active ? "is-on" : ""}`}
                          onClick={() =>
                            updateAiProvider(item._id, { isActive: !active })
                          }
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

            <div className="field-group">
              <label htmlFor="ai-models" className="field-label">
                Models (Optional, comma-separated)
              </label>
              <input
                id="ai-models"
                type="text"
                className="input-control"
                value={modelsInput}
                onChange={(e) => setModelsInput(e.target.value)}
                placeholder={
                  provider === "groq"
                    ? "Leave blank for defaults, or e.g. llama-3.3-70b-versatile"
                    : provider === "gemini"
                      ? "Leave blank for defaults, or e.g. gemini-2.5-flash"
                      : "e.g. gpt-4o-mini"
                }
              />
            </div>

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