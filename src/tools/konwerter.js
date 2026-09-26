// Narzędzie „Konwerter”: pliki z jednego formatu na inny, w całości w przeglądarce (spec: .scratch/konwerter/spec.md).
import { icon } from '../icons.js';
import { esc } from '../html.js';
import { FORMATS, KIND_LABEL, ENGINES, detect, targetsFor, enginesFor, optionsFor } from './konwerter/formats.js';
import { convert, load, isLoaded } from './konwerter/engines.js';

const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const BIG_MEDIA = 300_000_000; // powyżej tego iPhone może nie mieć dość pamięci karty na wideo

const KIND_ICON = { image: 'zdjecie', audio: 'audio', video: 'wideo', pdf: 'dokument', doc: 'dokument' };

// Opcje: [wartość, etykieta]; pierwsza to domyślna.
const OPTIONS = {
  quality: { title: 'Jakość', items: [[90, 'Wysoka'], [80, 'Średnia'], [65, 'Niska']] },
  maxSize: { title: 'Rozmiar', items: [[0, 'Oryginał'], [2048, '2048 px'], [1080, '1080 px']] },
  bitrate: { title: 'Bitrate', items: [[192, '192'], [320, '320'], [256, '256'], [128, '128']] },
  resolution: { title: 'Rozdzielczość', items: [[0, 'Oryginał'], [1080, '1080p'], [720, '720p'], [480, '480p']] },
  gifWidth: { title: 'Szerokość', items: [[480, '480 px'], [320, '320 px'], [640, '640 px']] },
  dpi: { title: 'Rozdzielczość', items: [[150, 'Standard'], [300, 'Wysoka']] },
};

// Plik przekazany z innego narzędzia (np. z Pobieraczka); odbierany przy otwarciu Konwertera.
let inbox = [];
export function receive(file) {
  inbox.push(file);
  location.hash = '#/narzedzie/konwerter';
}

const formatSize = (b) => (b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} kB` : `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0).replace('.', ',')} MB`);

export function render(el) {
  let items = []; // [{ file, format, state, progress, error }]
  let to = null;
  let opts = {};
  let results = null; // File[] po konwersji
  let busy = false;
  let engineMsg = '';

  el.innerHTML = `
    <div class="ht-section-block ht-stack" id="kv"></div>
    <input type="file" id="kv-input" multiple hidden>`;
  const $ = (s) => el.querySelector(s);
  const box = $('#kv');
  const input = $('#kv-input');

  const kindOf = () => {
    const kinds = new Set(items.filter((i) => i.format).map((i) => FORMATS[i.format].kind));
    return kinds.size === 1 ? [...kinds][0] : null;
  };
  const known = () => items.filter((i) => i.format);

  function add(files) {
    for (const file of files) items.push({ file, format: detect(file.name, file.type), state: 'ready', progress: 0 });
    results = null;
    const targets = targetsFor(known().map((i) => i.format));
    if (!targets.includes(to)) to = targets[0] ?? null;
    setDefaults();
    draw();
  }

  function setDefaults() {
    const kind = kindOf();
    const keys = kind && to ? optionsFor(kind, to) : [];
    opts = Object.fromEntries(keys.map((k) => [k, opts[k] ?? OPTIONS[k].items[0][0]]));
  }

  /* --- widok ----------------------------------------------------------------- */

  function draw() {
    if (!items.length) {
      box.innerHTML = `
        <div class="ht-empty">
          <span class="ht-well">${icon('konwerter', 'md')}</span>
          <p class="ht-card-title">Wybierz pliki do konwersji</p>
          <p class="ht-lead">Obrazy (także HEIC z iPhone'a), audio, wideo, PDF i dokumenty. Pliki nie opuszczają telefonu.</p>
        </div>
        <button type="button" class="ht-btn ht-btn--primary" data-kv="pick">${icon('dodaj', 'sm')}Wybierz pliki</button>`;
      return;
    }
    const kind = kindOf();
    const targets = targetsFor(known().map((i) => i.format));
    const mixed = known().length && !kind;
    const unknown = items.some((i) => !i.format);
    const needed = to ? [...new Set(known().flatMap((i) => enginesFor(i.format, to)))].filter((e) => !isLoaded(e)) : [];
    const mb = needed.reduce((s, e) => s + ENGINES[e].mb, 0);
    const big = known().some((i) => ['video', 'audio'].includes(FORMATS[i.format].kind) && i.file.size > BIG_MEDIA);

    box.innerHTML = `
      <section class="ht-group" aria-labelledby="kv-g-files">
        <div class="ht-section-head">
          <h3 class="ht-section" id="kv-g-files">Pliki</h3>
          ${busy ? '' : '<button type="button" class="ht-btn-text" data-kv="pick">Dodaj</button>'}
        </div>
        <ul class="ht-rows">
          ${items.map((it, i) => rowHtml(it, i)).join('')}
        </ul>
        ${mixed ? '<span class="ht-field-error" role="alert">Wybierz pliki jednego rodzaju, np. same zdjęcia albo same filmy.</span>' : ''}
        ${unknown ? '<span class="ht-field-error" role="alert">Pliki oznaczone „nieznany” zostaną pominięte.</span>' : ''}
        ${big && IOS ? '<span class="ht-caption">Duży plik: iPhone może nie mieć dość pamięci na konwersję w przeglądarce.</span>' : ''}
      </section>

      ${results ? resultsHtml() : `
      ${targets.length ? `
      <section class="ht-group" aria-labelledby="kv-g-to">
        <div class="ht-section-head">
          <h3 class="ht-section" id="kv-g-to">Na format</h3>
          <span class="ht-meta">${esc(targetNote(kind))}</span>
        </div>
        <div class="ht-segmented${targets.length > 4 ? ' ht-segmented--scroll' : ''}" role="group" aria-labelledby="kv-g-to">
          ${targets.map((t) => `<button type="button" data-kv-to="${t}" aria-pressed="${t === to}" ${busy ? 'disabled' : ''}>${FORMATS[t].label}</button>`).join('')}
        </div>
      </section>` : ''}
      ${Object.keys(opts).map((k) => optionHtml(k)).join('')}
      ${engineMsg || (mb ? `<span class="ht-caption">Pierwsza konwersja tego rodzaju pobierze silnik ${ENGINES[needed[0]].label} (ok. ${mb} MB). Potem działa bez pobierania.</span>` : '')}
      <div class="ht-dock">
        <button type="button" class="ht-btn ht-btn--primary" data-kv="convert" ${!to || busy || mixed ? 'disabled' : ''}>${icon('konwerter', 'sm')}${busy ? 'Konwertuję…' : `Konwertuj (${known().length})`}</button>
      </div>`}`;
  }

  function rowHtml(it, i) {
    const f = it.format ? FORMATS[it.format] : null;
    const state = it.state === 'working' ? `${Math.round(it.progress * 100)}%`
      : it.state === 'done' ? 'Gotowe'
      : it.state === 'error' ? 'Błąd'
      : '';
    return `
      <li class="ht-row" style="--p:${it.state === 'working' ? it.progress : 0}">
        ${icon(f ? KIND_ICON[f.kind] : 'dokument', 'md')}
        <span class="ht-row__name">
          <span>${esc(it.file.name)}</span>
          <span class="ht-caption">${f ? f.label : 'nieznany'}, ${formatSize(it.file.size)}${it.error ? ` · <span class="ht-field-error">${esc(it.error)}</span>` : ''}</span>
        </span>
        <span class="ht-row__state">${state}</span>
        ${busy ? '' : `<button type="button" class="ht-icon-btn ht-hit" data-kv-remove="${i}" aria-label="Usuń ${esc(it.file.name)}">${icon('zamknij', 'sm')}</button>`}
        ${it.state === 'working' ? '<span class="ht-row__bar"></span>' : ''}
      </li>`;
  }

  // Co powstanie: np. „Jeden plik PDF”, „Strona po stronie”, „Tekst i podstawowy układ”.
  function targetNote(kind) {
    if (!to) return '';
    if (kind === 'image' && to === 'pdf') return known().length > 1 ? 'Wszystkie w jeden plik' : 'Jeden plik';
    if (kind === 'pdf' && to !== 'docx') return 'Strona po stronie';
    if ((kind === 'pdf' && to === 'docx') || (kind === 'doc' && to === 'pdf')) return 'Tekst i podstawowy układ';
    if (kind === 'video' && ['mp3', 'm4a'].includes(to)) return 'Sam dźwięk';
    return '';
  }

  function optionHtml(key) {
    const o = OPTIONS[key];
    const label = o.items.find(([v]) => v === opts[key])?.[1] ?? '';
    return `
      <section class="ht-group" aria-labelledby="kv-g-${key}">
        <div class="ht-section-head">
          <h3 class="ht-section" id="kv-g-${key}">${o.title}</h3>
          <span class="ht-meta">${key === 'bitrate' ? `${opts[key]} kb/s` : esc(label)}</span>
        </div>
        <div class="ht-segmented" role="group" aria-labelledby="kv-g-${key}">
          ${o.items.map(([v, l]) => `<button type="button" data-kv-opt="${key}" data-value="${v}" aria-pressed="${v === opts[key]}" ${busy ? 'disabled' : ''}>${l}</button>`).join('')}
        </div>
      </section>`;
  }

  function resultsHtml() {
    const total = results.reduce((s, f) => s + f.size, 0);
    return `
      <section class="ht-group" aria-labelledby="kv-g-out">
        <div class="ht-section-head">
          <h3 class="ht-section" id="kv-g-out">Gotowe</h3>
          <span class="ht-meta">${results.length} ${results.length === 1 ? 'plik' : 'pliki'}, ${formatSize(total)}</span>
        </div>
        <ul class="ht-rows">
          ${results.map((f) => `
            <li class="ht-row">
              ${icon(KIND_ICON[FORMATS[detect(f.name)]?.kind] ?? 'dokument', 'md')}
              <span class="ht-row__name"><span>${esc(f.name)}</span><span class="ht-caption">${formatSize(f.size)}</span></span>
            </li>`).join('')}
        </ul>
        ${IOS ? `<span class="ht-caption">W oknie Udostępnij wybierz „${results.every((f) => f.type.startsWith('image/')) ? 'Zachowaj obrazy' : results.every((f) => ['video/mp4', 'video/quicktime'].includes(f.type)) ? 'Zachowaj wideo' : 'Zachowaj w Plikach'}”.</span>` : ''}
      </section>
      <button type="button" class="ht-btn-text" data-kv="again" style="align-self:flex-start">Zmień format albo opcje</button>
      <div class="ht-dock">
        <button type="button" class="ht-btn ht-btn--primary" data-kv="save">${icon('pobieranie', 'sm')}Zapisz (${results.length})</button>
      </div>`;
  }

  /* --- konwersja ------------------------------------------------------------- */

  async function run() {
    const list = known();
    busy = true;
    list.forEach((it) => Object.assign(it, { state: 'ready', progress: 0, error: null }));
    draw();
    try {
      // Silniki po kolei, z postępem pobierania (tylko za pierwszym razem).
      for (const name of [...new Set(list.flatMap((i) => enginesFor(i.format, to)))]) {
        if (isLoaded(name)) continue;
        await load(name, (got, total) => {
          engineMsg = `<span class="ht-caption" role="status">Pobieram silnik ${ENGINES[name].label}: ${Math.round(got / 1e6)}${total ? ` z ${Math.round(total / 1e6)}` : ''} MB</span>`;
          draw();
        });
      }
      engineMsg = '';
      const files = list.map((it) => Object.assign(it.file, { format: it.format }));
      results = await convert(files, to, opts, (i, p) => {
        const it = list[Math.min(i, list.length - 1)];
        list.forEach((x, j) => {
          if (j < i) Object.assign(x, { state: 'done', progress: 1 });
        });
        Object.assign(it, { state: p >= 1 ? 'done' : 'working', progress: p });
        draw();
      });
      list.forEach((it) => (it.state = 'done'));
    } catch (ex) {
      const current = list.find((it) => it.state === 'working') ?? list[0];
      Object.assign(current, { state: 'error', error: ex?.message || 'Nie udało się przekonwertować.' });
      engineMsg = !navigator.onLine ? '<span class="ht-field-error" role="alert">Brak internetu: silnika nie da się pobrać. Spróbuj po połączeniu.</span>' : '';
      results = null;
    }
    busy = false;
    draw();
    if (results) box.querySelector('.ht-dock')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function save() {
    // Od razu w tym dotknięciu: Safari otwiera okno Udostępnij tylko ok. 5 s po dotknięciu.
    if (IOS && navigator.canShare?.({ files: results })) {
      navigator.share({ files: results }).catch(() => {});
      return;
    }
    results.forEach((file, i) => setTimeout(() => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }, i * 300));
  }

  /* --- zdarzenia ----------------------------------------------------------- */

  input.onchange = () => {
    add([...input.files]);
    input.value = '';
  };
  el.onclick = (e) => {
    const t = e.target.closest('[data-kv], [data-kv-to], [data-kv-opt], [data-kv-remove]');
    if (!t || t.disabled) return;
    if (t.dataset.kvTo) {
      to = t.dataset.kvTo;
      setDefaults();
      return draw();
    }
    if (t.dataset.kvOpt) {
      opts[t.dataset.kvOpt] = Number(t.dataset.value);
      return draw();
    }
    if (t.dataset.kvRemove) {
      items.splice(Number(t.dataset.kvRemove), 1);
      return add([]);
    }
    const action = t.dataset.kv;
    if (action === 'pick') input.click();
    if (action === 'convert') run();
    if (action === 'save') save();
    if (action === 'again') {
      results = null;
      items.forEach((it) => Object.assign(it, { state: 'ready', progress: 0, error: null }));
      draw();
    }
  };

  add(inbox.splice(0)); // plik przekazany z innego narzędzia
}
