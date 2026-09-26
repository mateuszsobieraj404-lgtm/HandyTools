// Narzędzie „Konwerter”: pliki z jednego formatu na inny, w całości w przeglądarce (spec: .scratch/konwerter/spec.md).
import { icon } from '../icons.js';
import { esc } from '../html.js';
import { FORMATS, ENGINES, detect, targetsFor, enginesFor, optionsFor } from './konwerter/formats.js';
import { convert, load, isLoaded } from './konwerter/engines.js';

const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const BIG_MEDIA = 300_000_000; // powyżej tego iPhone może nie mieć dość pamięci karty na wideo

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
const files = (n) => `${n} ${n === 1 ? 'plik' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'pliki' : 'plików'}`;

export function render(el) {
  // Każdy plik ma własny format docelowy i opcje (`to`, `opts`); przy plikach jednego rodzaju można
  // zamiast tego ustawić wszystko wspólnie (`common`). `out` to gotowe pliki, `doneKey` – ustawienia, z którymi powstały.
  let items = []; // [{ file, format, to, opts, checked, open, state, progress, error, out, doneKey }]
  let mode = 'all'; // 'all' wspólne ustawienia | 'each' dla każdego pliku
  const common = { to: null, opts: {} };
  let busy = false;
  let engineMsg = '';

  el.innerHTML = `
    <div class="ht-section-block ht-stack" id="kv"></div>
    <input type="file" id="kv-input" multiple hidden>`;
  const box = el.querySelector('#kv');
  const input = el.querySelector('#kv-input');

  const known = () => items.filter((i) => i.format);
  const kindOf = (it) => FORMATS[it.format].kind;
  const sameKind = () => {
    const kinds = new Set(known().map(kindOf));
    return kinds.size === 1 ? [...kinds][0] : null;
  };
  // Wspólne ustawienia tylko przy jednym rodzaju plików; przy jednym pliku zawsze.
  const shared = () => !!sameKind() && (mode === 'all' || known().length < 2);
  const setupOf = (it) => (shared() ? common : it);
  const keyOf = (it) => JSON.stringify([setupOf(it).to, setupOf(it).opts]);
  const chosen = () => known().filter((i) => i.checked);
  const pending = () => chosen().filter((i) => i.state !== 'done');
  const outputs = (list) => [...new Set(list.flatMap((i) => i.out ?? []))]; // wspólny PDF z kilku zdjęć tylko raz
  const defaults = (kind, to, prev = {}) => Object.fromEntries(optionsFor(kind, to).map((k) => [k, prev[k] ?? OPTIONS[k].items[0][0]]));
  const reset = (it) => Object.assign(it, { state: 'ready', progress: 0, error: null, out: null, merged: false });

  function add(list) {
    for (const file of list) {
      const format = detect(file.name, file.type);
      const to = format ? targetsFor([format])[0] : null;
      items.push({ file, format, to, opts: format ? defaults(FORMATS[format].kind, to) : {}, checked: !!format, open: false, state: 'ready', progress: 0 });
    }
    // Wspólny format musi pasować do wszystkich plików (np. po dodaniu innych).
    const kind = sameKind();
    const targets = kind ? targetsFor(known().map((i) => i.format)) : [];
    if (!targets.includes(common.to)) common.to = targets[0] ?? null;
    common.opts = kind && common.to ? defaults(kind, common.to, common.opts) : {};
    draw();
  }

  /* --- widok ----------------------------------------------------------------- */

  function draw() {
    // Ustawienia zmienione po konwersji: plik trzeba przekonwertować jeszcze raz.
    for (const it of known()) if (it.out && it.doneKey !== keyOf(it)) reset(it);

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
    const kind = sameKind();
    const all = shared();
    const todo = pending();
    const ready = outputs(chosen());
    const needed = [...new Set(todo.flatMap((i) => enginesFor(i.format, setupOf(i).to)))].filter((e) => !isLoaded(e));
    const mb = needed.reduce((s, e) => s + ENGINES[e].mb, 0);
    const big = todo.some((i) => ['video', 'audio'].includes(kindOf(i)) && i.file.size > BIG_MEDIA);
    const everyChecked = chosen().length === known().length;

    box.innerHTML = `
      <section class="ht-group" aria-labelledby="kv-g-files">
        <div class="ht-section-head">
          <h3 class="ht-section" id="kv-g-files">Pliki</h3>
          ${busy ? '' : `<span style="display:flex;gap:var(--ht-gap)">
            ${known().length > 1 ? `<button type="button" class="ht-btn-text" data-kv="all">${everyChecked ? 'Odznacz' : 'Zaznacz'} wszystko</button>` : ''}
            <button type="button" class="ht-btn-text" data-kv="pick">Dodaj</button>
          </span>`}
        </div>
        <ul class="ht-rows">
          ${items.map((it, i) => rowHtml(it, i)).join('')}
        </ul>
        ${big && IOS ? '<span class="ht-caption">Duży plik: iPhone może nie mieć dość pamięci na konwersję w przeglądarce.</span>' : ''}
      </section>

      ${kind && known().length > 1 ? `
      <section class="ht-group" aria-labelledby="kv-g-mode">
        <h3 class="ht-section" id="kv-g-mode">Ustawienia</h3>
        <div class="ht-segmented" role="group" aria-labelledby="kv-g-mode">
          <button type="button" data-kv-mode="all" aria-pressed="${mode === 'all'}" ${busy ? 'disabled' : ''}>Wspólne</button>
          <button type="button" data-kv-mode="each" aria-pressed="${mode === 'each'}" ${busy ? 'disabled' : ''}>Dla każdego pliku</button>
        </div>
      </section>` : ''}

      ${all && common.to ? setupHtml(common, kind, targetsFor(known().map((i) => i.format)), '') : ''}

      ${engineMsg || (mb ? `<span class="ht-caption">Pierwsza konwersja tego rodzaju pobierze ${needed.length > 1 ? 'silniki' : `silnik ${ENGINES[needed[0]].label}`} (ok. ${mb} MB). Potem działa bez pobierania.</span>` : '')}
      ${!todo.length && ready.length && IOS ? `<span class="ht-caption">W oknie Udostępnij wybierz „${shareHint(ready)}”.</span>` : ''}
      <div class="ht-dock">
        ${!todo.length && ready.length && !busy
          ? `<button type="button" class="ht-btn ht-btn--primary" data-kv="save">${icon('pobieranie', 'sm')}Zapisz (${ready.length})</button>`
          : `<button type="button" class="ht-btn ht-btn--primary" data-kv="convert" ${busy || !todo.length ? 'disabled' : ''}>${icon('konwerter', 'sm')}${busy ? 'Konwertuję…' : `Konwertuj (${todo.length})`}</button>`}
      </div>`;
  }

  function rowHtml(it, i) {
    const f = it.format && FORMATS[it.format];
    const each = f && !shared();
    const s = f && setupOf(it);
    const name = esc(it.file.name);
    const state = it.state === 'working' ? `${Math.round(it.progress * 100)}%`
      : it.state === 'done' ? 'Gotowe'
      : it.state === 'error' ? 'Błąd'
      : '';
    const size = it.out?.length ? it.out.reduce((sum, x) => sum + x.size, 0) : it.file.size;
    const caption = !f ? `Nieznany format, pominięty · ${formatSize(it.file.size)}`
      : it.error ? `<span class="ht-field-error">${esc(it.error)}</span>`
      : it.merged ? `${f.label} → PDF · wspólny plik, ${formatSize(size)}`
      : [
          `${f.label} → ${FORMATS[s.to].label}`,
          ...(each ? Object.entries(s.opts).map(([k, v]) => optLabel(k, v)) : []),
          it.out?.length > 1 ? `${files(it.out.length)}, ${formatSize(size)}` : formatSize(size),
        ].join(' · ');
    const main = `
      <span class="ht-row__name"><span>${name}</span><span class="ht-caption">${caption}</span></span>
      <span class="ht-row__state">${state}</span>`;
    return `
      <li class="ht-row ht-row--wrap" style="--p:${it.state === 'working' ? it.progress : 0}">
        <button type="button" class="ht-check ht-hit" data-kv-check="${i}" aria-pressed="${it.checked}" aria-label="Zaznacz ${name}" ${!f || busy ? 'disabled' : ''}>${icon('zaznacz', 'sm')}</button>
        ${each
          ? `<button type="button" class="ht-row__main" data-kv-open="${i}" aria-expanded="${it.open}">${main}<span class="ht-row__chevron">${icon('dalej', 'sm')}</span></button>`
          : `<span class="ht-row__main">${main}</span>`}
        ${busy ? ''
          : it.out?.length ? `<button type="button" class="ht-icon-btn ht-hit" data-kv-save="${i}" aria-label="Zapisz ${name}">${icon('pobieranie', 'sm')}</button>`
          : each ? ''
          : `<button type="button" class="ht-icon-btn ht-hit" data-kv-remove="${i}" aria-label="Usuń ${name}">${icon('zamknij', 'sm')}</button>`}
        ${it.state === 'working' ? '<span class="ht-row__bar"></span>' : ''}
        ${each && it.open ? `
          <div class="ht-row__panel">
            ${setupHtml(it, kindOf(it), targetsFor([it.format]), i)}
            ${busy ? '' : `<button type="button" class="ht-btn-text" data-kv-remove="${i}" style="align-self:flex-start">Usuń z listy</button>`}
          </div>` : ''}
      </li>`;
  }

  // Format docelowy i opcje: wspólne (i = '') jako grupy ekranu, jednego pliku jako panel w wierszu.
  function setupHtml(s, kind, targets, i) {
    const block = (id, title, meta, buttons, scroll) => `
      <${i === '' ? 'section class="ht-group"' : 'div class="ht-field-group"'} aria-labelledby="${id}">
        <div class="ht-section-head">
          <h3 class="ht-section" id="${id}">${title}</h3>
          <span class="ht-meta">${esc(meta)}</span>
        </div>
        <div class="ht-segmented${scroll ? ' ht-segmented--scroll' : ''}" role="group" aria-labelledby="${id}">${buttons}</div>
      </${i === '' ? 'section' : 'div'}>`;
    const btn = (attrs, pressed, label) => `<button type="button" ${attrs} data-kv-item="${i}" aria-pressed="${pressed}" ${busy ? 'disabled' : ''}>${label}</button>`;
    return [
      block(`kv-to${i}`, 'Na format', targetNote(kind, s.to, i === '' ? chosen().length : 1),
        targets.map((t) => btn(`data-kv-to="${t}"`, t === s.to, FORMATS[t].label)).join(''), targets.length > 4),
      ...Object.keys(s.opts).map((k) => block(`kv-${k}${i}`, OPTIONS[k].title, optLabel(k, s.opts[k]),
        OPTIONS[k].items.map(([v, l]) => btn(`data-kv-opt="${k}" data-value="${v}"`, v === s.opts[k], l)).join(''))),
    ].join('');
  }

  const optLabel = (k, v) => (k === 'bitrate' ? `${v} kb/s` : OPTIONS[k].items.find(([x]) => x === v)?.[1] ?? '');

  // Co powstanie: np. „Wszystkie w jeden plik”, „Strona po stronie”, „Tekst i podstawowy układ”.
  function targetNote(kind, to, count) {
    if (kind === 'image' && to === 'pdf') return count > 1 ? 'Wszystkie w jeden plik' : 'Jeden plik';
    if (kind === 'pdf' && to !== 'docx') return 'Strona po stronie';
    if ((kind === 'pdf' && to === 'docx') || (kind === 'doc' && to === 'pdf')) return 'Tekst i podstawowy układ';
    if (kind === 'video' && ['mp3', 'm4a'].includes(to)) return 'Sam dźwięk';
    return '';
  }

  const shareHint = (list) => (list.every((f) => f.type.startsWith('image/')) ? 'Zachowaj obrazy'
    : list.every((f) => ['video/mp4', 'video/quicktime'].includes(f.type)) ? 'Zachowaj wideo'
    : 'Zachowaj w Plikach');

  /* --- konwersja ------------------------------------------------------------- */

  async function run() {
    const list = pending();
    busy = true;
    list.forEach(reset);
    // Zdjęcia na PDF ze wspólnymi ustawieniami: wszystkie w jeden plik; poza tym plik po pliku.
    const jobs = shared() && sameKind() === 'image' && common.to === 'pdf' && list.length > 1 ? [list] : list.map((it) => [it]);
    for (const group of jobs) {
      const { to, opts } = setupOf(group[0]);
      const key = keyOf(group[0]);
      try {
        for (const name of enginesFor(group[0].format, to)) {
          if (isLoaded(name)) continue;
          await load(name, (got, total) => {
            engineMsg = `<span class="ht-caption" role="status">Pobieram silnik ${ENGINES[name].label}: ${Math.round(got / 1e6)}${total ? ` z ${Math.round(total / 1e6)}` : ''} MB</span>`;
            draw();
          });
        }
        engineMsg = '';
        const out = await convert(group.map((it) => Object.assign(it.file, { format: it.format })), to, opts, (n, p) => {
          group.forEach((x, j) => j <= n && Object.assign(x, { state: 'working', progress: j < n ? 1 : p }));
          draw();
        });
        group.forEach((it) => Object.assign(it, { state: 'done', progress: 1, out, merged: group.length > 1, doneKey: key }));
      } catch (ex) {
        engineMsg = !navigator.onLine ? '<span class="ht-field-error" role="alert">Brak internetu: silnika nie da się pobrać. Spróbuj po połączeniu.</span>' : '';
        group.forEach((it) => Object.assign(it, { state: 'error', error: ex?.message || 'Nie udało się przekonwertować.' }));
      }
      draw();
    }
    busy = false;
    draw();
    if (outputs(chosen()).length) box.querySelector('.ht-dock')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function save(list) {
    // Od razu w tym dotknięciu: Safari otwiera okno Udostępnij tylko ok. 5 s po dotknięciu.
    if (IOS && navigator.canShare?.({ files: list })) {
      navigator.share({ files: list }).catch(() => {});
      return;
    }
    list.forEach((file, i) => setTimeout(() => {
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
    const t = e.target.closest('[data-kv], [data-kv-to], [data-kv-opt], [data-kv-remove], [data-kv-check], [data-kv-open], [data-kv-save], [data-kv-mode]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    const it = items[Number(d.kvCheck ?? d.kvOpen ?? d.kvSave ?? d.kvRemove ?? d.kvItem)];
    const target = d.kvItem === '' ? common : it; // wspólne albo jednego pliku
    if (d.kvCheck) it.checked = !it.checked;
    else if (d.kvOpen) it.open = !it.open;
    else if (d.kvSave) return save(it.out);
    else if (d.kvRemove) {
      items.splice(items.indexOf(it), 1);
      return add([]);
    } else if (d.kvTo) {
      target.to = d.kvTo;
      target.opts = defaults(target === common ? sameKind() : kindOf(it), d.kvTo, target.opts);
    } else if (d.kvOpt) target.opts = { ...target.opts, [d.kvOpt]: Number(d.value) };
    else if (d.kvMode) {
      // Na „dla każdego pliku” każdy startuje od wspólnych ustawień (o ile pasują do jego formatu).
      if (d.kvMode === 'each' && mode === 'all') {
        for (const x of known()) {
          if (targetsFor([x.format]).includes(common.to)) x.to = common.to;
          x.opts = defaults(kindOf(x), x.to, common.opts);
        }
      }
      mode = d.kvMode;
    } else if (d.kv === 'pick') return input.click();
    else if (d.kv === 'all') {
      const on = chosen().length !== known().length;
      known().forEach((x) => (x.checked = on));
    } else if (d.kv === 'convert') return run();
    else if (d.kv === 'save') return save(outputs(chosen()));
    draw();
  };

  add(inbox.splice(0)); // plik przekazany z innego narzędzia
}

