export const names = (list: unknown): string =>
  Array.isArray(list)
    ? list
        .map((a: { name?: string } | null) => a?.name)
        .filter(Boolean)
        .join(", ")
    : "";

export const fmtTime = (secs: number): string => {
  let s = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  s %= 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
