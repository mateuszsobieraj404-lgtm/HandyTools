import * as pobieranie from './tools/pobieranie.js';

// Zawartość z makiety. Wszystko tu jest POGLĄDOWE (Dokumentacja_produktu.md, sekcja 0)
// i do podmiany, gdy zapadnie decyzja o funkcjach.

// Nowe narzędzie = nowy wpis. Kontrakt: Dokumentacja_produktu.md, sekcja 3.
// Opcjonalne `render(el)` rysuje treść ekranu narzędzia; bez niego ekran pokazuje stan pusty.
// Opcjonalne `state()` zwraca { value, live? } dla karty stanu w menu albo null.
export const tools = [
  { id: 'pobieranie', name: 'Pobieranie', icon: 'pobieranie', ...pobieranie },
  { id: 'kalkulator', name: 'Kalkulator', icon: 'kalkulator' },
  { id: 'konwerter', name: 'Konwerter', icon: 'konwerter' },
  { id: 'notatki', name: 'Notatki', icon: 'notatki' },
  { id: 'miarka', name: 'Miarka', icon: 'miarka' },
  { id: 'kalendarz', name: 'Kalendarz', icon: 'kalendarz' },
  { id: 'eksport-pdf', name: 'Eksport PDF', icon: 'eksport' },
  { id: 'listy', name: 'Listy sprzętu', icon: 'listy' },
  { id: 'skaner', name: 'Skaner QR', icon: 'skaner' },
  { id: 'stoper', name: 'Stoper', icon: 'stoper' },
];

// Skróty używają ikon swoich narzędzi.
export const shortcuts = [
  { title: 'Nowa lista', caption: 'Z szablonu sceny', tool: 'listy' },
  { title: 'Skanuj kod', caption: 'Dopisz do listy', tool: 'skaner' },
  { title: 'Stoper', caption: 'Odmierz czas', tool: 'stoper' },
  { title: 'Szybka notatka', caption: 'Tekst lub dyktowanie', tool: 'notatki' },
];

// Ekrany spoza narzędzi (adres #/<id>).
export const pages = {
  ustawienia: { title: 'Ustawienia', icon: 'ustawienia' },
  aktualizacje: { title: 'Aktualizacje', icon: 'aktualizacje' },
  wsparcie: { title: 'Wsparcie', icon: 'wsparcie' },
  konto: { title: 'Konto', icon: 'konto' },
  'edytuj-skroty': { title: 'Edytuj skróty', icon: 'edytuj' },
};

// Pasek dolny: najwyżej 5 pozycji, najwyżej jedna `primary`.
// `page` otwiera ekran, `sheet` otwiera arkusz.
export const bar = [
  { label: 'Ustawienia', icon: 'ustawienia', page: 'ustawienia' },
  { label: 'Aktualizacje', icon: 'aktualizacje', page: 'aktualizacje' },
  { label: 'Wsparcie', icon: 'wsparcie', page: 'wsparcie' },
  { label: 'Własna', icon: 'wlasna', sheet: 'wlasna', empty: true },
  { label: 'Skróty', icon: 'skroty', sheet: 'skroty', primary: true },
];
