// Shared helpers and colour tokens for portfolio components

export const C = {
  accent: "#13438bff",
  accentLight: "#71a2e1ff",
  green: "#2dd98f",
  red: "#f25c5c",
  amber: "#73f3adff",
  teal: "#2ec4b6",
  border: "#2a2a35",
  text2: "#8b8a96",
};

const AVATAR_COLOURS = [
  "#7c6af7", "#2dd98f", "#f0a429", "#2ec4b6",
  "#f25c5c", "#a89cf8", "#6ad4dd", "#f5a623",
];

export function avatarColour(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatINR(val: number | null | undefined): string {
  if (val == null) return "—";
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}L`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

export function formatINRShort(val: number | null | undefined): string {
  if (val == null) return "—";
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

export function formatPct(val: number | null | undefined, decimals = 1): string {
  if (val == null) return "—";
  return `${val.toFixed(decimals)}%`;
}

export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoStr));
}

export function scoreColour(score: number): string {
  if (score >= 65) return C.green;
  if (score >= 40) return C.amber;
  return C.red;
}
