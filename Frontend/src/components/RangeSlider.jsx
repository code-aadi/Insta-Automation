export default function RangeSlider({
  label = "Reply Delay",
  value,
  onChange,
  min = 0,
  max = 60,
  step = 1,
  unit = "sec",
}) {
  return (
    <div className="slider-container">
      <div className="slider-header">
        <label className="slider-label">{label}</label>
        <span className="slider-value">
          {value} {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input"
      />

      <div className="slider-limits">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
