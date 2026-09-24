// Czas fragmentu: wspólne dla aplikacji i serwera.

// „1:05”, „1:02:03” albo „65” → sekundy; puste → null; śmieci → NaN
export function toSeconds(s) {
  const str = String(s ?? '').trim();
  if (str === '') return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(str)) return NaN;
  const parts = str.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// 65 → „1:05”, 3723 → „1:02:03”
export function formatTime(sec) {
  const s = Math.round(sec);
  const hms = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const [h, m, r] = hms;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}
