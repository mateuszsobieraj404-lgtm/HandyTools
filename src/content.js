import * as pobieranie from './tools/pobieranie.js';
import * as konwerter from './tools/konwerter.js';
import { changelogHtml, hasNew, markSeen } from './changelog.js';
import { icon } from './icons.js';

// Zawartość z makiety. Wszystko tu jest POGLĄDOWE (Dokumentacja_produktu.md, sekcja 0)
// i do podmiany, gdy zapadnie decyzja o funkcjach.

// Nowe narzędzie = nowy wpis. Kontrakt: Dokumentacja_produktu.md, sekcja 3.
// Opcjonalne `render(el)` rysuje treść ekranu narzędzia; bez niego ekran pokazuje stan pusty.
// Opcjonalne `state()` zwraca { value, live? } dla karty stanu w menu albo null.
// Opcjonalne `settings(el)` rysuje ekran Ustawienia → <narzędzie> (`settingsCaption`: podpis na liście).
export const tools = [
  { id: 'pobieranie', name: 'Pobieraczek', icon: 'pobieranie', settingsCaption: 'Serwer, formaty, jakość', ...pobieranie },
  { id: 'konwerter', name: 'Konwerter', icon: 'konwerter', ...konwerter },
  { id: 'kalkulator', name: 'Kalkulator', icon: 'kalkulator' },
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

// Ekrany spoza narzędzi (adres #/<id>). Opcjonalne: `render()` → HTML treści, `onOpen()` przy wejściu.
export const pages = {
  ustawienia: { title: 'Ustawienia', icon: 'ustawienia', render: settingsList },
  aktualizacje: { title: 'Aktualizacje', icon: 'aktualizacje', render: changelogHtml, onOpen: markSeen },
  konto: { title: 'Konto', icon: 'konto' },
  'edytuj-skroty': { title: 'Edytuj skróty', icon: 'edytuj' },
};

// Pasek dolny: najwyżej 5 pozycji, najwyżej jedna `primary`.
// `page` otwiera ekran, `sheet` otwiera arkusz, `dot()` → kropka „coś nowego czeka”.
export const bar = [
  { label: 'Ustawienia', icon: 'ustawienia', page: 'ustawienia' },
  { label: 'Aktualizacje', icon: 'aktualizacje', page: 'aktualizacje', dot: hasNew },
  { label: 'Home', icon: 'home', page: '' }, // '' = menu główne
  { label: 'Własna', icon: 'wlasna', sheet: 'wlasna', empty: true },
  { label: 'Skróty', icon: 'skroty', sheet: 'skroty', primary: true },
];

// Ustawienia: lista narzędzi, które mają własne ustawienia (adres #/ustawienia/<id>).
function settingsList() {
  return `
  <section class="ht-section-block" aria-labelledby="h-settings">
    <h2 class="ht-section" id="h-settings">Narzędzia</h2>
    ${tools.filter((t) => t.settings).map((t) => `
      <a class="ht-card" href="#/ustawienia/${t.id}">
        <span class="ht-well">${icon(t.icon, 'md')}</span>
        <span class="ht-card__text"><span class="ht-card-title">${t.name}</span><span class="ht-caption">${t.settingsCaption ?? ''}</span></span>
        ${icon('dalej', 'sm', 'ht-card__chevron')}
      </a>`).join('')}
  </section>`;
}
