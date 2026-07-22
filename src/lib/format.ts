export const TZS = (n: number) =>
  "TZS " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));

export const shortTZS = (n: number) => {
  if (n >= 1_000_000) return "TZS " + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return "TZS " + (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "K";
  return TZS(n);
};

export const fmtDate = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtTime = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const fmtRelative = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

export const sleep = (ms = 400) => new Promise((r) => setTimeout(r, ms));
