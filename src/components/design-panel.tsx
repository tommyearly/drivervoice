"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dv-design-panel";

const defaults = {
  navy: "#102335",
  teal: "#087F8C",
  paper: "#F5F7FA",
  amber: "#E8AF35",
  radius: 16,
  density: 1,
  shadow: 1,
  fontScale: 1,
  headingWeight: 620,
  wave: "slope",
  display: "literata",
};

type Settings = typeof defaults;

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitise(input: Partial<Settings>): Settings {
  return {
    navy: isHex(input.navy) ? input.navy : defaults.navy,
    teal: isHex(input.teal) ? input.teal : defaults.teal,
    paper: isHex(input.paper) ? input.paper : defaults.paper,
    amber: isHex(input.amber) ? input.amber : defaults.amber,
    radius: clamp(input.radius, 0, 28, defaults.radius),
    density: clamp(input.density, 0.8, 1.3, defaults.density),
    shadow: clamp(input.shadow, 0, 2, defaults.shadow),
    fontScale: clamp(input.fontScale, 0.95, 1.2, defaults.fontScale),
    headingWeight: clamp(input.headingWeight, 500, 750, defaults.headingWeight),
    wave: input.wave === "curve" || input.wave === "steps" ? input.wave : "slope",
    display: input.display === "alt" ? "alt" : "literata",
  };
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function apply(settings: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--dv-navy", settings.navy);
  root.style.setProperty("--dv-teal", settings.teal);
  root.style.setProperty("--dv-paper", settings.paper);
  root.style.setProperty("--dv-amber", settings.amber);
  root.style.setProperty("--dv-ink", settings.navy);
  root.style.setProperty("--dv-radius", `${settings.radius}px`);
  root.style.setProperty("--dv-density", String(settings.density));
  root.style.setProperty("--dv-font-scale", String(settings.fontScale));
  root.style.setProperty("--dv-heading-weight", String(settings.headingWeight));
  root.style.setProperty("--dv-shadow", settings.shadow === 0 ? "none" : `0 ${8 + settings.shadow * 10}px ${30 + settings.shadow * 20}px rgba(16, 35, 53, ${0.04 + settings.shadow * 0.04})`);
  root.dataset.wave = settings.wave;
  root.style.setProperty("--font-display", settings.display === "alt" ? "var(--font-source), sans-serif" : "var(--font-literata), Georgia, serif");
}

export function DesignPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const next = sanitise(JSON.parse(saved) as Partial<Settings>);
      setSettings(next);
      apply(next);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function update(patch: Partial<Settings>) {
    const next = sanitise({ ...settings, ...patch });
    setSettings(next);
    apply(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function randomise() {
    const teal = ["#087F8C", "#0B6E75", "#1F6F8B", "#0E7490"][Math.floor(Math.random() * 4)] ?? defaults.teal;
    const amber = ["#E8AF35", "#D9A441", "#E0B15A", "#C8963E"][Math.floor(Math.random() * 4)] ?? defaults.amber;
    const wave = (["slope", "curve", "steps"] as const)[Math.floor(Math.random() * 3)] ?? "slope";
    update({ teal, amber, wave, radius: 8 + Math.floor(Math.random() * 16) });
  }

  function reset() {
    setSettings(defaults);
    apply(defaults);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drivers-voice-design.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(100%-2rem,22rem)]">
      <button type="button" className="touch float-right rounded-full bg-navy px-4 font-semibold text-white" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Design controls
      </button>
      {open ? (
        <div className="dv-card mt-12 max-h-[70vh] overflow-auto p-4 text-sm">
          <p className="font-semibold text-navy">Dev design controls</p>
          <p className="mt-1 text-[var(--dv-muted)]">These settings stay in this browser. They do not store reports.</p>
          <details open className="mt-3">
            <summary className="cursor-pointer font-semibold">Colours</summary>
            {(["navy", "teal", "paper", "amber"] as const).map((key) => (
              <label key={key} className="mt-2 flex items-center justify-between gap-3">
                <span className="capitalize">{key}</span>
                <input aria-label={key} type="color" value={settings[key]} onChange={(event) => update({ [key]: event.target.value })} />
              </label>
            ))}
          </details>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">Typography</summary>
            <label className="mt-2 block">Scale
              <input className="w-full" type="range" min="0.95" max="1.2" step="0.01" value={settings.fontScale} onChange={(event) => update({ fontScale: Number(event.target.value) })} />
            </label>
            <label className="mt-2 block">Heading weight
              <input className="w-full" type="range" min="500" max="750" step="10" value={settings.headingWeight} onChange={(event) => update({ headingWeight: Number(event.target.value) })} />
            </label>
            <label className="mt-2 block">Display face
              <select className="dv-select mt-1" value={settings.display} onChange={(event) => update({ display: event.target.value === "alt" ? "alt" : "literata" })}>
                <option value="literata">Literata</option>
                <option value="alt">Source Sans</option>
              </select>
            </label>
          </details>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">Buttons and spacing</summary>
            <label className="mt-2 block">Radius
              <input className="w-full" type="range" min="0" max="28" value={settings.radius} onChange={(event) => update({ radius: Number(event.target.value) })} />
            </label>
            <label className="mt-2 block">Density
              <input className="w-full" type="range" min="0.8" max="1.3" step="0.05" value={settings.density} onChange={(event) => update({ density: Number(event.target.value) })} />
            </label>
            <label className="mt-2 block">Shadow
              <input className="w-full" type="range" min="0" max="2" step="1" value={settings.shadow} onChange={(event) => update({ shadow: Number(event.target.value) })} />
            </label>
          </details>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">Dividers</summary>
            <select className="dv-select mt-2" value={settings.wave} onChange={(event) => update({ wave: event.target.value })}>
              <option value="slope">Slope</option>
              <option value="curve">Curve</option>
              <option value="steps">Steps</option>
            </select>
          </details>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="touch rounded-full bg-teal px-3 text-white" onClick={randomise}>Randomise</button>
            <button type="button" className="touch rounded-full border border-navy/20 px-3" onClick={reset}>Reset</button>
            <button type="button" className="touch rounded-full border border-navy/20 px-3" onClick={exportJson}>Export JSON</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
