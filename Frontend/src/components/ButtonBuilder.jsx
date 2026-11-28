import { Plus, Trash2 } from "lucide-react";

export default function ButtonBuilder({ buttons = [], onChange, max = 3, label = "Buttons", locked = false }) {
  const update = (idx, patch) => onChange(buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const add = () => onChange([...buttons, { type: "web_url", title: "", url: "", payload: "" }]);
  const remove = (idx) => onChange(buttons.filter((_, i) => i !== idx));

  return (
    <div className="field-group">
      <div className="btn-builder-head">
        <span className="field-label">{label} ({buttons.length}/{max})</span>
        {!locked && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={buttons.length >= max}>
            <Plus size={14} /><span>Add Button</span>
          </button>
        )}
      </div>

      {buttons.length === 0 && <span className="field-hint">No buttons — plain text will be sent.</span>}

      {buttons.map((b, idx) => (
        <div key={idx} className="btn-builder-row">
          <div className="btn-builder-top">
            <select className="select-control" style={{ maxWidth: 148 }} value={b.type}
              disabled={locked} onChange={(e) => update(idx, { type: e.target.value })}>
              <option value="web_url">Open Link</option>
              <option value="postback">Send Reply</option>
            </select>
            <input type="text" className="input-control" value={b.title} maxLength={20}
              placeholder="Button text" onChange={(e) => update(idx, { title: e.target.value })} />
            {!locked && (
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => remove(idx)} aria-label="Remove button">
                <Trash2 size={15} />
              </button>
            )}
          </div>
          {b.type === "web_url" ? (
            <input type="url" className="input-control" value={b.url || ""} placeholder="https://..."
              onChange={(e) => update(idx, { url: e.target.value })} />
          ) : (
            <input type="text" className="input-control" value={b.payload || ""} placeholder="Payload sent back to bot"
              onChange={(e) => update(idx, { payload: e.target.value })} />
          )}
          <span className="field-hint">{b.title.length}/20 characters</span>
        </div>
      ))}
    </div>
  );
}