// Formateo de nombres y tiempos.

export const names = (list) =>
  Array.isArray(list)
    ? list
        .map((a) => a && a.name)
        .filter(Boolean)
        .join(", ")
    : "";

export const fmtTime = (secs) => {
  let s = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  s %= 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
