// Tekst z zewnątrz (tytuły z serwisów, wpisy użytkownika) zawsze przez esc() przed innerHTML.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
