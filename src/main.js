import '../Design System/handytools-tokens.css';
import logo from './sygnet.png';
import { icon } from './icons.js';
import { esc } from './html.js';
import { tools, shortcuts, pages, bar } from './content.js';

const app = document.getElementById('app');
const layer = document.getElementById('layer');
const GRID_SIZE = 6; // tyle kafli widać, zanim rozwiniesz „Wszystkie”
let showAll = false;
let opener = null;

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');

/* --- klocki ------------------------------------------------------------- */

const barHtml = (current) => `
  <nav class="ht-bar ht-in" style="--i:4" aria-label="Pasek aplikacji">
    ${bar.map((b) => {
      const dot = b.dot?.();
      const inner = `<span class="ht-bar__icon">${icon(b.icon, 'md')}${dot ? '<span class="ht-dot"></span>' : ''}</span><span class="ht-bar-label"${dot ? ' aria-hidden="true"' : ''}>${b.label}</span>`;
      const dotLabel = dot ? ` aria-label="${b.label}, jest nowa wersja"` : '';
      if ('page' in b) return `<a class="ht-bar__item" href="#/${b.page}"${dotLabel} ${current === b.page ? 'aria-current="page"' : ''}>${inner}</a>`;
      const mod = b.primary ? ' ht-bar__item--primary' : b.empty ? ' ht-bar__item--empty' : '';
      const label = b.empty ? ` aria-label="${b.label}, nieprzypisana"` : '';
      return `<button type="button" class="ht-bar__item${mod}" data-sheet="${b.sheet}"${label}>${inner}</button>`;
    }).join('')}
  </nav>`;

const stateCard = (t, s) => `
  <a class="ht-card-sm" href="#/narzedzie/${t.id}">
    <span class="ht-card-sm__top">${icon(t.icon, 'md')}${s.live ? '<span class="ht-dot ht-dot--live" role="img" aria-label="Trwa"></span>' : ''}</span>
    <span class="ht-card-sm__text"><span class="ht-value">${esc(s.value)}</span><span class="ht-meta">${t.name}</span></span>
  </a>`;

// Sekcja „Ostatnie”: tylko narzędzia, które mają bieżący stan.
function recent() {
  const cards = tools.map((t) => t.state?.() && stateCard(t, t.state())).filter(Boolean);
  return cards.length ? `
  <section class="ht-section-block ht-in" style="--i:2" aria-labelledby="h-recent">
    <h2 class="ht-section" id="h-recent">Ostatnie</h2>
    <div class="ht-pair">${cards.join('')}</div>
  </section>` : '';
}

const empty = (iconName, title, lead) => `
  <div class="ht-empty">
    <span class="ht-well">${icon(iconName, 'md')}</span>
    <p class="ht-card-title">${title}</p>
    <p class="ht-lead">${lead}</p>
  </div>`;

const tile = (t, i) => `
  <a class="ht-tile" href="#/narzedzie/${t.id}" style="--i:${i}">
    <span class="ht-tile__face">${icon(t.icon, 'tile')}</span>
    <span class="ht-tile-label">${t.name}</span>
  </a>`;

const sheetHead = (title, caption) => `
  <span class="ht-sheet__handle"></span>
  <div class="ht-sheet__head">
    <div><h2 class="ht-title" id="h-sheet">${title}</h2><span class="ht-caption">${caption}</span></div>
    <button type="button" class="ht-icon-btn ht-hit" data-close aria-label="Zamknij panel">${icon('zamknij', 'sm')}</button>
  </div>`;

/* --- ekrany ------------------------------------------------------------- */

const menuScreen = () => `
  <h1 class="ht-sr-only">HandyTools, menu główne</h1>
  <header class="ht-header ht-in" style="--i:0">
    <img class="ht-header__logo" src="${logo}" alt="HandyTools">
    <a class="ht-avatar ht-hit" href="#/konto" aria-label="Konto">MS</a>
  </header>
  <div class="ht-section-block ht-in" style="--i:1">
    <div class="ht-field-wrap">
      <label class="ht-sr-only" for="ht-find">Szukaj narzędzia</label>
      ${icon('szukaj', 'sm', 'ht-field__icon')}
      <input class="ht-field ht-field--search" id="ht-find" type="search" placeholder="Szukaj narzędzia" autocomplete="off">
    </div>
  </div>
  ${recent()}
  <section class="ht-section-block" aria-labelledby="h-tools">
    <div class="ht-section-head ht-in" style="--i:3">
      <h2 class="ht-section" id="h-tools">Narzędzia</h2>
      <button type="button" class="ht-chip ht-hit" data-action="all" aria-controls="grid"></button>
    </div>
    <div class="ht-grid" id="grid" style="--start:240ms"></div>
  </section>`;

// Szkielet ekranu narzędzia i podstrony: nagłówek z powrotem i tytułem, treść, pasek.
const subScreen = (title, content, back = '#/') => `
  <header class="ht-header ht-header--tool ht-in" style="--i:0">
    <a class="ht-icon-btn ht-hit" href="${back}" aria-label="${back === '#/' ? 'Wróć do menu' : 'Wróć'}">${icon('wstecz', 'sm')}</a>
    <h1 class="ht-title">${title}</h1>
  </header>
  <div class="ht-in" style="--i:1" id="content">${content}</div>`;

const sheets = {
  skroty: () => `
    ${sheetHead('Skróty', 'Cztery akcje bez wchodzenia w narzędzie')}
    <div class="ht-pair ht-stagger" style="--start:180ms">
      ${shortcuts.map((s, i) => `
        <a class="ht-card-action" href="#/narzedzie/${s.tool}" style="--i:${i}">
          <span class="ht-card-action__top"><span class="ht-well">${icon(tools.find((t) => t.id === s.tool).icon, 'md')}</span></span>
          <span class="ht-card-action__text"><span class="ht-card-title">${s.title}</span><span class="ht-caption">${s.caption}</span></span>
        </a>`).join('')}
    </div>
    <a class="ht-btn ht-btn--secondary" href="#/edytuj-skroty">${icon('edytuj', 'sm')}Edytuj skróty</a>`,
  wlasna: () => `
    ${sheetHead('Własna', 'Pozycja nieprzypisana')}
    ${empty('wlasna', 'Wolne miejsce na pasku', 'Przypisanie narzędzia do tej pozycji dojdzie w kolejnej wersji.')}`,
};

/* --- siatka i wyszukiwarka ---------------------------------------------- */

function renderGrid(animate) {
  const grid = document.getElementById('grid');
  const chip = document.querySelector('[data-action="all"]');
  const raw = document.getElementById('ht-find').value.trim();
  const q = norm(raw);
  const list = q ? tools.filter((t) => norm(t.name).includes(q)) : showAll ? tools : tools.slice(0, GRID_SIZE);

  grid.classList.toggle('ht-stagger', animate);
  grid.innerHTML = list.length
    ? list.map(tile).join('')
    : `<p class="ht-lead" style="grid-column: 1 / -1">Brak narzędzia „${esc(raw)}”.</p>`;

  chip.hidden = Boolean(q) || tools.length <= GRID_SIZE;
  chip.textContent = showAll ? 'Zwiń' : `Wszystkie ${tools.length}`;
  chip.setAttribute('aria-expanded', showAll);
}

/* --- arkusz ------------------------------------------------------------- */

function openSheet(name, trigger) {
  opener = trigger;
  layer.innerHTML = `<div class="ht-scrim" data-close></div>
    <section class="ht-sheet" role="dialog" aria-modal="true" aria-labelledby="h-sheet">${sheets[name]()}</section>`;
  app.inert = true;
  layer.querySelector('.ht-icon-btn').focus();
}

function closeSheet() {
  const sheet = layer.querySelector('.ht-sheet');
  if (!sheet || sheet.classList.contains('is-closing')) return;
  layer.querySelectorAll('.ht-scrim, .ht-sheet').forEach((el) => el.classList.add('is-closing'));
  sheet.onanimationend = (e) => {
    if (e.target !== sheet) return; // animacje kart w środku też bąbelkują
    layer.innerHTML = '';
    app.inert = false;
    opener?.focus();
  };
}

/* --- nawigacja ---------------------------------------------------------- */

function route() {
  layer.innerHTML = '';
  app.inert = false;

  const [, a, b] = location.hash.split('/'); // '#/narzedzie/kalkulator' → ['#', 'narzedzie', 'kalkulator']
  const tool = a === 'narzedzie' && tools.find((t) => t.id === b);
  const setTool = a === 'ustawienia' && b && tools.find((t) => t.id === b && t.settings); // #/ustawienia/<narzędzie>
  const page = pages[a];
  let body;

  const block = (html) => `<div class="ht-section-block">${html}</div>`;
  if (tool) body = subScreen(tool.name, tool.render ? '' : block(empty(tool.icon, 'W przygotowaniu', 'Ekran jest gotowy, funkcja dojdzie później.')));
  else if (setTool) body = subScreen(setTool.name, '', '#/ustawienia');
  else if (page) {
    page.onOpen?.();
    body = subScreen(page.title, page.render ? page.render() : block(empty(page.icon, 'W przygotowaniu', 'Ten ekran dostanie treść, gdy zapadnie decyzja o funkcji.')));
  }
  else body = menuScreen();

  app.innerHTML = `<div class="ht-screen"><div class="ht-glow"></div>${body}<span class="ht-spacer"></span>${barHtml(tool ? null : setTool ? 'ustawienia' : page ? a : '')}</div>`; // '' = menu (Home aktywny)

  if (tool?.render) tool.render(document.getElementById('content'));
  if (setTool) setTool.settings(document.getElementById('content'));
  if (!tool && !page) {
    showAll = false;
    renderGrid(true);
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-sheet], [data-close], [data-action]');
  if (!t) return;
  if (t.dataset.sheet) openSheet(t.dataset.sheet, t);
  else if ('close' in t.dataset) closeSheet();
  else if (t.dataset.action === 'all') {
    showAll = !showAll;
    renderGrid(false);
  }
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());
app.addEventListener('input', (e) => e.target.id === 'ht-find' && renderGrid(false));
window.addEventListener('hashchange', route);
route();
