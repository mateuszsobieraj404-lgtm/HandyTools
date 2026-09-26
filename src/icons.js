// Jeden zestaw konturowy (system wizualny, sekcja 5). Ścieżki z makiety 1.1.
const paths = {
  szukaj: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  wstecz: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  zamknij: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  edytuj: '<path d="M4 16.5v3.5h3.5L18.2 9.3l-3.5-3.5Z"/><path d="M14.7 5.8l3.5 3.5"/>',
  dalej: '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
  odtworz: '<path d="M7.5 5.2v13.6L18.5 12Z"/>',
  zaznacz: '<path d="M5.5 12.5l4.2 4.2 8.8-9.4"/>',
  pauza:'<path d="M8.5 5.5v13"/><path d="M15.5 5.5v13"/>',
  konto:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>',

  ustawienia: '<path d="M4 7.5h10"/><path d="M18 7.5h2"/><path d="M4 16.5h4"/><path d="M12 16.5h8"/><circle cx="16" cy="7.5" r="2.2"/><circle cx="10" cy="16.5" r="2.2"/>',
  aktualizacje: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.6 4.2v3.9h-3.9"/>',
  home: '<path d="M4.5 10.4 12 4.3l7.5 6.1v8.3a1.3 1.3 0 0 1-1.3 1.3h-3.9v-5.6H9.7V20H5.8a1.3 1.3 0 0 1-1.3-1.3Z"/>',
  wlasna: '<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.6" stroke-dasharray="3.4 3.2"/><path d="M12 9.2v5.6"/><path d="M9.2 12h5.6"/>',
  skroty: '<path d="M13.2 3.2 5.8 13.1h5.1l-.9 7.7 7.4-9.9h-5.1Z"/>',

  kalkulator: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7"/><path d="M9 12h.01"/><path d="M12 12h.01"/><path d="M15 12h.01"/><path d="M9 16.2h.01"/><path d="M12 16.2h.01"/><path d="M15 16.2h.01"/>',
  konwerter: '<path d="M4 8.5h13"/><path d="M13.5 5l3.5 3.5-3.5 3.5"/><path d="M20 15.5H7"/><path d="M10.5 12L7 15.5l3.5 3.5"/>',
  notatki: '<path d="M6 4.5h8.5L19 9v10a1.8 1.8 0 0 1-1.8 1.8H6A1.8 1.8 0 0 1 4.2 19V6.3A1.8 1.8 0 0 1 6 4.5Z"/><path d="M14 4.6V9h4.5"/><path d="M7.8 13.3h7"/><path d="M7.8 16.8h4.6"/>',
  miarka: '<rect x="3" y="8.5" width="18" height="7" rx="2"/><path d="M7 8.5v3"/><path d="M10.3 8.5v2"/><path d="M13.7 8.5v3"/><path d="M17 8.5v2"/>',
  kalendarz: '<rect x="3.8" y="5.5" width="16.4" height="15" rx="3"/><path d="M3.8 10.2h16.4"/><path d="M8.4 3.5v4"/><path d="M15.6 3.5v4"/><path d="M8.4 14.6h2"/><path d="M13.6 14.6h2"/>',
  pobieranie: '<path d="M12 3.6v9.6"/><path d="M8.6 10l3.4 3.2 3.4-3.2"/><path d="M4.5 15.4v2.8a2.2 2.2 0 0 0 2.2 2.2h10.6a2.2 2.2 0 0 0 2.2-2.2v-2.8"/>',
  eksport: '<path d="M12 13.2V3.6"/><path d="M8.6 6.8 12 3.6l3.4 3.2"/><path d="M4.5 15.4v2.8a2.2 2.2 0 0 0 2.2 2.2h10.6a2.2 2.2 0 0 0 2.2-2.2v-2.8"/>',
  listy: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1.2"/><path d="M8.6 12.4l1.7 1.7 3.4-3.4"/><path d="M8.6 17.3h6.8"/>',
  skaner: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5"/><path d="M20 8.5V6a2 2 0 0 0-2-2h-2.5"/><path d="M4 15.5V18a2 2 0 0 0 2 2h2.5"/><path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5"/><rect x="9" y="9" width="6" height="6" rx="1.4"/>',
  stoper: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.8v3.7l2.4 1.6"/><path d="M9.8 3h4.4"/>',
};

// size: 'tile' (30 px) | 'md' (22 px) | 'sm' (18 px)
export const icon = (name, size, extra = '') =>
  `<svg class="ht-i ht-i--${size} ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
