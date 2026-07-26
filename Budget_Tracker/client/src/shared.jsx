import {
  Utensils, Car, Home, ShoppingBag, Film, HeartPulse, Briefcase,
  GraduationCap, Plane, Gift, PawPrint, MoreHorizontal,
} from "lucide-react";

export const ICONS = {
  utensils: Utensils,
  car: Car,
  home: Home,
  "shopping-bag": ShoppingBag,
  film: Film,
  "heart-pulse": HeartPulse,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  plane: Plane,
  gift: Gift,
  "paw-print": PawPrint,
  "more-horizontal": MoreHorizontal,
};

export const ICON_CHOICES = Object.keys(ICONS);

export const COLOR_CHOICES = [
  "#4F46E5", "#0EA5E9", "#10B981", "#8B5CF6",
  "#F59E0B", "#EC4899", "#6366F1", "#14B8A6",
  "#F97316", "#64748B",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((ch) => ch + ch).join("")
    : normalized;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case red: h = (green - blue) / delta + (green < blue ? 6 : 0); break;
      case green: h = (blue - red) / delta + 2; break;
      case blue: h = (red - green) / delta + 4; break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const hue2rgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

export function getCategoryDisplayColor(color) {
  const value = typeof color === "string" && color.trim() ? color.trim() : COLOR_CHOICES[0];
  const hex = value.startsWith("#") ? value : `#${value}`;
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const enhanced = hslToRgb(h, clamp(s - 0.04, 0.12, 0.85), clamp(l - 0.02, 0.32, 0.55));
  return rgbToHex(enhanced);
}

export function iconFor(key) {
  return ICONS[key] || MoreHorizontal;
}

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

export function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function periodKey(dateStr, periodType) {
  if (!dateStr) return "";
  const { y, m, d } = parseDateParts(dateStr);
  if (periodType === "yearly") return String(y);
  if (periodType === "monthly") return `${y}-${String(m).padStart(2, "0")}`;
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function periodLabel(key, periodType) {
  if (periodType === "yearly") return key;
  if (periodType === "weekly") {
    const { y, m, d } = parseDateParts(key);
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`;
  }
  const [y, m] = key.split("-");
  return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function periodShortLabel(key, periodType) {
  if (periodType === "yearly") return key;
  if (periodType === "weekly") {
    const { y, m, d } = parseDateParts(key);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  const [y, m] = key.split("-");
  return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export const money = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="markGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#markGrad)" />
      <path
        d="M10 9.5v13M10 16h6M16.5 9.5l7 6.5-7 6.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ size = "text-xl", withMark = true, markSize = 26 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {withMark && <Mark size={markSize} />}
      <span className={`font-display font-bold ${size} text-ink tracking-tight`}>Budget Tracker</span>
    </span>
  );
}

export function LoadingScreen({ message = "Loading…" }) {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="spinner" style={{ width: "1.75rem", height: "1.75rem", borderWidth: "2.5px" }} />
        <p className="text-sm font-medium text-muted">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state state-card rounded-2xl">
      <div className="empty-state-icon">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented-control">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`segmented-option ${value === opt.id ? "active" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function GranularityToggle({ value, onChange }) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[
        { id: "weekly", label: "Week" },
        { id: "monthly", label: "Month" },
        { id: "yearly", label: "Year" },
      ]}
    />
  );
}

export function PeriodToggle({ value, onChange }) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[
        { id: "weekly", label: "Weekly" },
        { id: "monthly", label: "Monthly" },
      ]}
    />
  );
}

export const CHART_COLORS = {
  primary: "#4F46E5",
  primaryLight: "#818CF8",
  over: "#EF4444",
  overLight: "#FCA5A5",
  grid: "#E2E8F0",
  axis: "#94A3B8",
  tooltip: {
    bg: "#0F172A",
    text: "#F8FAFC",
  },
};
