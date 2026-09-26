// Narzędzie „Pobieraczek”: wideo i audio z linku przez serwer na komputerze (server/server.js).
// Spec: .scratch/pobieranie/spec.md
import { icon } from '../icons.js';
import { esc } from '../html.js';
import { toSeconds, formatTime } from '../time.js';

const KEY = {
  cfg: 'ht.pobieranie.serwer',
  prefs: 'ht.pobieranie.domyslne',
  history: 'ht.pobieranie.historia',
  job: 'ht.pobieranie.zadanie',
};
const HISTORY_MAX = 20;
const POLL_MS = 1000;
const SETTINGS_HREF = '#/ustawienia/pobieranie';

const VIDEO_FORMATS = { mp4: 'MP4 (zapis w Zdjęciach)', mkv: 'MKV (tylko Pliki)' };
const AUDIO_FORMATS = { mp3: 'MP3', m4a: 'M4A', flac: 'FLAC (bezstratny)', wav: 'WAV (bezstratny)' };
const QUALITIES = ['best', 2160, 1440, 1080, 720, 480, 360];
const BITRATES = [320, 256, 192, 128];
const LOSSY = ['mp3', 'm4a']; // tylko tu bitrate ma znaczenie
const AUDIO = Object.keys(AUDIO_FORMATS);
const DEFAULT_PREFS = { videoFormat: 'mp4', videoQuality: 'best', audioFormat: 'mp3', audioBitrate: 256 };

const load = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (k, v) => {
  try {
    v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* prywatne okno: działa, tylko nie zapamięta */
  }
};
const prefs = () => ({ ...DEFAULT_PREFS, ...load(KEY.prefs, {}) });

// Polska odmiana po liczbie: pl(3, ['zdjęcie', 'zdjęcia', 'zdjęć']) → 'zdjęcia'.
const pl = (n, [one, few, many]) => (n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many);
const plural = (n) => pl(n, ['pobranie', 'pobrania', 'pobrań']);
const base = (cfg = load(KEY.cfg, {})) => cfg.url.replace(/\/+$/, '');
const fileUrl = (job) => `${base()}/jobs/${job.id}/file`;
const options = (entries, selected) => entries.map(([v, label]) => `<option value="${v}"${String(v) === String(selected) ? ' selected' : ''}>${label}</option>`).join('');
const qualityLabel = (q) => (q === 'best' ? 'Najlepsza' : `${q}p`);

function formatSize(bytes) {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3))} kB`;
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(bytes < 1e7 ? 1 : 0).replace('.', ',')} MB`;
  return `${(bytes / 1e9).toFixed(1).replace('.', ',')} GB`;
}

// Preferowana jakość, a gdy jej nie ma: najbliższa niższa, a gdy nie ma niższej: najbliższa wyższa.
// `heights` malejąco, np. [1080, 720, 360].
export function pickHeight(heights, pref) {
  if (!heights.length) return null;
  if (pref === 'best') return heights[0];
  return heights.find((h) => h <= pref) ?? heights[heights.length - 1];
}

// Pierwszy link w tekście (aplikacje czasem kopiują „Zobacz to: https://…”).
const findUrl = (text) => String(text ?? '').match(/https?:\/\/\S+/)?.[0] ?? String(text ?? '').trim();

// Schowek: YouTube, X i inne aplikacje na iPhonie kopiują link jako typ „adres URL”,
// a nie „tekst”, więc najpierw czytamy wszystkie typy, a dopiero potem sam tekst.
async function readClipboard() {
  if (navigator.clipboard?.read) {
    for (const item of await navigator.clipboard.read()) {
      for (const type of ['text/uri-list', 'text/plain']) {
        if (!item.types.includes(type)) continue;
        const text = await (await item.getType(type)).text();
        const line = text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#'));
        if (line) return findUrl(line);
      }
    }
    return '';
  }
  return findUrl(await navigator.clipboard.readText());
}

// Na iPhonie aplikacja z ekranu głównego nie pobiera plików linkiem. Jak w cobalt.tools:
// plik ściągamy do pamięci i zapisujemy przez okno Udostępnij (→ Zdjęcia albo Pliki).
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// ponytail: plik trzymany w RAM (części + gotowy File), a karta na iPhonie ma ok. 384 MB.
// Większe pliki: zapis przyrostowy do OPFS, jak robi cobalt.
const IOS_LIMIT = 200_000_000;

// Przesyłanie gotowego pliku z komputera do pamięci telefonu. Żyje poza ekranem narzędzia,
// więc wyjście i powrót nie przerywa przesyłania; ekran podpina się przez `update`.
let transfer = null; // { id, progress, file, error, tooBig, update, sharing, shown }

async function fetchFile(job) {
  const t = (transfer = { id: job.id, progress: 0, file: null, error: null });
  const update = () => t.update?.();
  try {
    const res = await fetch(fileUrl(job));
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Błąd serwera (${res.status}).`);
    const total = Number(res.headers.get('Content-Length')) || 0;
    if (IOS && total > IOS_LIMIT) {
      t.tooBig = true;
      throw new Error(`Plik ma ${formatSize(total)}, a iPhone zapisze z aplikacji najwyżej ${formatSize(IOS_LIMIT)}. Wybierz niższą jakość albo krótszy fragment.`);
    }
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      const p = total ? Math.floor((got * 100) / total) : 0;
      if (p !== t.progress) {
        t.progress = p;
        update();
      }
    }
    const name = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    t.file = new File(chunks, name ? decodeURIComponent(name) : 'plik', { type: res.headers.get('Content-Type') || '' });
  } catch (ex) {
    t.error = ex instanceof TypeError ? 'Przesyłanie przerwane. Sprawdź internet i spróbuj ponownie.' : ex.message;
  }
  update();
}

async function api(path, body, cfg = load(KEY.cfg, {})) {
  let res;
  try {
    res = await fetch(base(cfg) + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${cfg.password}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error(navigator.onLine
      ? 'Serwer nie odpowiada. Czy komputer jest włączony, a serwer uruchomiony?'
      : 'Brak internetu. Pobieranie wymaga sieci.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Błąd serwera (${res.status}).`), { status: res.status });
  return data;
}

// Karta stanu w menu: stan, nie nazwa.
export function state() {
  const job = load(KEY.job, null);
  if (job) return job.status === 'done' ? { value: 'Gotowe' } : { value: 'W toku', live: true };
  const n = load(KEY.history, []).length;
  return n ? { value: `${n} ${plural(n)}` } : null;
}

export function render(el) {
  if (load(KEY.cfg, null)) return main(el);
  el.innerHTML = `
    <div class="ht-section-block">
      <div class="ht-empty">
        <span class="ht-well">${icon('pobieranie', 'md')}</span>
        <p class="ht-card-title">Połącz z komputerem</p>
        <p class="ht-lead">Pobieraczek działa przez serwer na Twoim komputerze. Wpisz jego adres i hasło w ustawieniach.</p>
      </div>
      <a class="ht-btn ht-btn--primary" href="${SETTINGS_HREF}">${icon('ustawienia', 'sm')}Ustaw serwer</a>
    </div>`;
}

/* --- ustawienia (pasek → Ustawienia → Pobieraczek) --------------------------- */

export function settings(el) {
  const cfg = load(KEY.cfg, { url: '', password: '' });
  const p = prefs();
  el.innerHTML = `
    <form class="ht-section-block" id="dl-srv" novalidate aria-labelledby="dl-s-srv">
      <h2 class="ht-section" id="dl-s-srv">Serwer</h2>
      <p class="ht-lead">Pobieraczek działa przez serwer na Twoim komputerze. Hasło jest w pliku <code>server/.env</code>.</p>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-server">Adres serwera</label>
        <input class="ht-field" id="dl-server" type="url" inputmode="url" autocomplete="off" placeholder="https://komputer.tailnet.ts.net" value="${esc(cfg.url)}">
      </div>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-pass">Hasło</label>
        <div class="ht-field-wrap">
          <input class="ht-field" id="dl-pass" type="password" autocomplete="off" style="padding-right:84px" value="${esc(cfg.password)}">
          <button type="button" class="ht-btn-text ht-field__action" data-dl="reveal">Pokaż</button>
        </div>
        <span class="ht-field-error" id="dl-set-err" role="alert" hidden></span>
        <span class="ht-caption" id="dl-set-ok" role="status" hidden>Połączono z serwerem.</span>
      </div>
      <button class="ht-btn ht-btn--primary" type="submit">Zapisz i sprawdź</button>
    </form>

    <section class="ht-section-block" aria-labelledby="dl-s-video">
      <h2 class="ht-section" id="dl-s-video">Wideo</h2>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-p-vformat">Format domyślny</label>
        <select class="ht-field" id="dl-p-vformat" data-pref="videoFormat">${options(Object.entries(VIDEO_FORMATS), p.videoFormat)}</select>
      </div>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-p-quality">Jakość domyślna</label>
        <select class="ht-field" id="dl-p-quality" data-pref="videoQuality">${options(QUALITIES.map((q) => [q, qualityLabel(q)]), p.videoQuality)}</select>
        <span class="ht-caption">Gdy tej jakości nie ma, wybierana jest najbliższa niższa.</span>
      </div>
    </section>

    <section class="ht-section-block" aria-labelledby="dl-s-audio">
      <h2 class="ht-section" id="dl-s-audio">Audio</h2>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-p-aformat">Format domyślny</label>
        <select class="ht-field" id="dl-p-aformat" data-pref="audioFormat">${options(Object.entries(AUDIO_FORMATS), p.audioFormat)}</select>
      </div>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-p-bitrate">Bitrate domyślny</label>
        <select class="ht-field" id="dl-p-bitrate" data-pref="audioBitrate">${options(BITRATES.map((b) => [b, `${b} kb/s`]), p.audioBitrate)}</select>
        <span class="ht-caption">Dotyczy MP3 i M4A. Formaty i jakość zmienisz też przy każdym pobraniu. Zmiany zapisują się od razu.</span>
      </div>
    </section>`;

  const err = el.querySelector('#dl-set-err');
  const ok = el.querySelector('#dl-set-ok');
  el.onchange = (e) => {
    const key = e.target.dataset.pref;
    if (!key) return;
    const raw = e.target.value;
    save(KEY.prefs, { ...prefs(), [key]: key === 'audioBitrate' || (key === 'videoQuality' && raw !== 'best') ? Number(raw) : raw });
  };
  el.onclick = (e) => {
    const t = e.target.closest('[data-dl="reveal"]');
    if (!t) return;
    const f = el.querySelector('#dl-pass');
    f.type = f.type === 'password' ? 'text' : 'password';
    t.textContent = f.type === 'password' ? 'Pokaż' : 'Ukryj';
  };
  el.onsubmit = async (e) => {
    e.preventDefault();
    const next = { url: el.querySelector('#dl-server').value.trim(), password: el.querySelector('#dl-pass').value };
    err.hidden = true;
    ok.hidden = true;
    if (!/^https?:\/\//.test(next.url)) {
      err.textContent = 'Adres musi zaczynać się od https://';
      err.hidden = false;
      return;
    }
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = 'Sprawdzam…';
    try {
      await api('/health', null, next);
      save(KEY.cfg, next);
      ok.hidden = false;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Zapisz i sprawdź';
    }
  };
}

/* --- główny widok ---------------------------------------------------------- */

function main(el) {
  let info = null; // wynik /info dla bieżącego linku
  let choice = null; // { kind, height, container, format, bitrate }
  let sel = null; // wybrany fragment w sekundach: { from, to, max }
  let fileName = ''; // nazwa pliku (domyślnie tytuł), edytowana w grupie „Plik”
  let picked = null; // post z wieloma elementami: { picker, url, title, site, videos, photos, selected, activeVideo }
  let photoState = { status: 'idle' }; // zdjęcia: idle → fetching (done/total) → ready (files) | error

  el.innerHTML = `
    <form class="ht-section-block" id="dl-form" novalidate>
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-url">Link</label>
        <div class="ht-field-wrap">
          <input class="ht-field" id="dl-url" type="url" inputmode="url" autocomplete="off" placeholder="Wklej link do filmu albo utworu" style="padding-right:84px">
          <button type="button" class="ht-btn-text ht-field__action" data-dl="paste">Wklej</button>
        </div>
        <span class="ht-field-error" id="dl-err" role="alert" hidden></span>
      </div>
      <button class="ht-btn ht-btn--primary" type="submit" id="dl-check">Sprawdź</button>
    </form>
    <section class="ht-section-block" id="dl-picker" aria-live="polite" hidden></section>
    <section class="ht-section-block" id="dl-result" aria-live="polite" hidden></section>
    <section class="ht-section-block" id="dl-job" aria-live="polite" hidden></section>
    <section class="ht-section-block" id="dl-history" aria-labelledby="dl-h" hidden></section>
    <div class="ht-section-block">
      <a class="ht-btn-text" href="${SETTINGS_HREF}" style="align-self:flex-start">Ustawienia Pobieraczka</a>
    </div>`;

  const $ = (sel) => el.querySelector(sel);
  const urlField = $('#dl-url');
  const result = $('#dl-result');
  const jobBox = $('#dl-job');

  const showError = (box, msg) => {
    box.textContent = msg;
    box.hidden = !msg;
  };

  /* sprawdzenie linku; `item` = wybrany film z posta z wieloma elementami */
  async function check(item = null) {
    const url = item ? picked.url : findUrl(urlField.value);
    if (!item) urlField.value = url;
    showError($('#dl-err'), '');
    if (!url) return showError($('#dl-err'), 'Wklej link.');
    if (!item) {
      picked = null;
      $('#dl-picker').hidden = true;
    }
    result.hidden = false;
    result.innerHTML = '<div class="ht-preview ht-skeleton" role="status" aria-label="Sprawdzam link"></div>';
    if (item) result.scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('#dl-check').disabled = true;
    try {
      const data = await api('/info', item ? { url, item } : { url });
      if (data.picker) {
        result.hidden = true;
        info = null;
        picked = { ...data, selected: new Set(Array.from({ length: data.photos }, (_, i) => i)), activeVideo: null };
        photoState = { status: 'idle' };
        $('#dl-check').className = 'ht-btn ht-btn--secondary';
        return renderPicker();
      }
      info = data;
      if (picked) {
        picked.activeVideo = item;
        renderPicker(); // podświetl wybrany film, przycisk zdjęć przechodzi w drugorzędny
      }
      const p = prefs();
      choice = {
        kind: info.heights.length ? 'video' : 'audio',
        height: pickHeight(info.heights, p.videoQuality),
        container: p.videoFormat,
        format: p.audioFormat,
        bitrate: p.audioBitrate,
      };
      sel = info.duration ? { from: 0, to: Math.round(info.duration), max: Math.round(info.duration) } : null;
      $('#dl-check').className = 'ht-btn ht-btn--secondary'; // akcją główną jest teraz „Pobierz”
      renderResult();
    } catch (ex) {
      result.hidden = true;
      showError($('#dl-err'), ex.message);
    } finally {
      $('#dl-check').disabled = false;
    }
  }

  /* post z wieloma elementami: filmy (dotknij → zwykły panel) i zdjęcia (zaznacz → zapisz naraz) */
  const photoSrc = (n) => `${base()}/picker/${picked.picker}/${n}`;

  function renderPicker() {
    const p = picked;
    const box = $('#dl-picker');
    box.hidden = false;
    const parts = [
      p.photos && `${p.photos} ${pl(p.photos, ['zdjęcie', 'zdjęcia', 'zdjęć'])}`,
      p.videos.length && `${p.videos.length} ${pl(p.videos.length, ['film', 'filmy', 'filmów'])}`,
    ].filter(Boolean).join(' i ');
    const hint = [p.videos.length && 'Dotknij filmu, żeby go ustawić i pobrać.', p.photos && 'Dotknij zdjęcia, żeby je zaznaczyć albo odznaczyć.'].filter(Boolean).join(' ');
    box.innerHTML = `
      <div class="ht-card">
        <span class="ht-well">${icon('pobieranie', 'md')}</span>
        <span class="ht-card__text"><span class="ht-card-title">${esc(p.title)}</span><span class="ht-caption">${esc(p.site)}</span></span>
      </div>
      <div class="ht-section-head">
        <h2 class="ht-section">W poście: ${parts}</h2>
        ${p.photos > 1 ? `<button type="button" class="ht-btn-text" data-dl="all">${p.selected.size ? 'Odznacz' : 'Zaznacz'} wszystkie</button>` : ''}
      </div>
      <span class="ht-caption">${hint}</span>
      <div class="ht-thumbs">
        ${p.videos.map((v) => `
          <button type="button" class="ht-thumb" data-video="${v.item}" aria-label="Film ${v.item}${v.duration ? `, ${formatTime(v.duration)}` : ''}"${p.activeVideo === v.item ? ' aria-current="true"' : ''}>
            ${v.thumbnail ? `<img src="${esc(v.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
            <span class="ht-thumb__badge">${icon('odtworz', 'sm')}${v.duration ? formatTime(v.duration) : ''}</span>
          </button>`).join('')}
        ${Array.from({ length: p.photos }, (_, n) => `
          <button type="button" class="ht-thumb" data-photo="${n}" aria-label="Zdjęcie ${n + 1}" aria-pressed="${p.selected.has(n)}">
            <img src="${esc(photoSrc(n))}" alt="" loading="lazy">
            <span class="ht-thumb__check">${icon('zaznacz', 'sm')}</span>
          </button>`).join('')}
      </div>
      ${p.photos ? '<div class="ht-field-group" id="dl-photos-act"></div>' : ''}`;
    renderPhotoAction();
  }

  function renderPhotoAction() {
    const box = $('#dl-photos-act');
    if (!box) return;
    const n = picked.selected.size;
    const kind = info ? 'secondary' : 'primary'; // wybrany film ma już swoje „Pobierz”
    const s = photoState;
    box.innerHTML = s.status === 'fetching'
      ? `<button type="button" class="ht-btn ht-btn--${kind}" disabled>Pobieram ${s.done}/${s.total}…</button>`
      : s.status === 'ready'
        ? `<button type="button" class="ht-btn ht-btn--primary" data-dl="photos-save">${icon('pobieranie', 'sm')}Zapisz (${s.files.length})</button>
           ${IOS ? `<span class="ht-caption">W oknie Udostępnij wybierz „Zachowaj ${s.files.length === 1 ? 'obraz' : `${s.files.length} ${pl(s.files.length, ['obraz', 'obrazy', 'obrazów'])}`}”, żeby trafiły do Zdjęć.</span>` : ''}`
        : `${s.status === 'error' ? `<span class="ht-field-error" role="alert">${esc(s.error)}</span>` : ''}
           <button type="button" class="ht-btn ht-btn--${kind}" data-dl="photos" ${n ? '' : 'disabled'}>${icon('pobieranie', 'sm')}Pobierz ${n === picked.photos && n > 1 ? 'wszystkie' : 'zaznaczone'} (${n})</button>`;
  }

  // Zdjęcia do pamięci telefonu, po kolei; potem jedno okno Udostępnij na wszystkie.
  async function fetchPhotos() {
    const ids = [...picked.selected].sort((a, b) => a - b);
    photoState = { status: 'fetching', done: 0, total: ids.length };
    renderPhotoAction();
    const files = [];
    try {
      for (const n of ids) {
        const res = await fetch(photoSrc(n));
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Błąd serwera (${res.status}).`);
        const blob = await res.blob();
        const name = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
        files.push(new File([blob], name ? decodeURIComponent(name) : `zdjecie ${n + 1}.jpg`, { type: blob.type || 'image/jpeg' }));
        photoState.done = files.length;
        renderPhotoAction();
      }
      photoState = { status: 'ready', files };
    } catch (ex) {
      photoState = { status: 'error', error: ex instanceof TypeError ? 'Przesyłanie przerwane. Sprawdź internet i spróbuj ponownie.' : ex.message };
    }
    renderPhotoAction();
    if (photoState.status === 'ready') $('#dl-photos-act').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function photosSaved() {
    const count = photoState.files.length;
    save(KEY.history, [
      { url: picked.url, title: picked.title, thumbnail: null, label: `${count} ${pl(count, ['zdjęcie', 'zdjęcia', 'zdjęć'])}`, range: '', date: Date.now() },
      ...load(KEY.history, []),
    ].slice(0, HISTORY_MAX));
    renderHistory();
    photoState = { status: 'idle' };
    renderPhotoAction();
  }

  function savePhotos() {
    // Od razu w tym dotknięciu, jak przy filmie (Safari: okno Udostępnij tylko ok. 5 s po dotknięciu).
    const { files } = photoState;
    if (IOS && navigator.canShare?.({ files })) {
      if (photoState.sharing) return;
      photoState.sharing = true;
      navigator.share({ files }).then(photosSaved, (ex) => {
        photoState.sharing = false;
        if (ex.name !== 'AbortError') $('#dl-photos-act').insertAdjacentHTML('beforeend', `<span class="ht-field-error" role="alert">Nie udało się zapisać: ${esc(ex.message)}</span>`);
      });
      return;
    }
    // Android i komputer: każde zdjęcie jako zwykłe pobranie (przeglądarka może raz zapytać o zgodę).
    files.forEach((file, i) => setTimeout(() => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }, i * 300));
    photosSaved();
  }

  const ext = () => (choice.kind === 'audio' ? choice.format : choice.container);

  // Panel po sprawdzeniu linku: podgląd z tytułem, potem grupy Fragment / Co pobrać / Jakość / Format / Plik.
  // Wybory to kafle i pigułki (widać naraz wybór i jego rozmiar), nie rozwijane listy.
  const KINDS = [['video', 'Wideo', 'wideo'], ['mute', 'Bez dźwięku', 'bezdzwieku'], ['audio', 'Audio', 'audio']];

  function renderResult() {
    const meta = [info.site, info.duration && formatTime(info.duration)].filter(Boolean).join(' · ');
    const dur = sel?.max;
    fileName = info.title;
    result.classList.add("ht-stack"); // narzędzie wczytuje się od razu do zadania, bez kaskady wejść
    result.innerHTML = `
      <div class="ht-media">
        <div id="dl-preview-box"></div>
        <div class="ht-media__text">
          <h2 class="ht-title ht-media__title">${esc(info.title)}</h2>
          <span class="ht-caption">${esc(meta)}</span>
        </div>
      </div>

      <section class="ht-group" aria-labelledby="dl-g-frag">
        <div class="ht-section-head">
          <h3 class="ht-section" id="dl-g-frag">Fragment</h3>
          <span class="ht-meta" id="dl-frag-meta"></span>
        </div>
        ${sel ? `
        <div>
          <div class="ht-range" id="dl-range">
            <div class="ht-range__track"><div class="ht-range__fill"></div></div>
            <div class="ht-range__head" hidden></div>
            <input type="range" id="dl-rfrom" min="0" max="${dur}" step="1" value="0" aria-label="Początek fragmentu">
            <input type="range" id="dl-rto" min="0" max="${dur}" step="1" value="${dur}" aria-label="Koniec fragmentu">
          </div>
          <input type="range" class="ht-playhead" id="dl-head" min="0" max="${dur}" step="0.1" value="0" aria-label="Pozycja odtwarzania" hidden>
        </div>` : ''}
        <div class="ht-trim">
          <div class="ht-field-group">
            <label class="ht-field-label" for="dl-from">Od</label>
            <input class="ht-field" id="dl-from" type="text" autocomplete="off" placeholder="0:00">
          </div>
          <button type="button" class="ht-btn ht-btn--secondary ht-trim__play" data-dl="play" aria-label="Odtwórz fragment" hidden>${icon('odtworz', 'sm')}</button>
          <div class="ht-field-group">
            <label class="ht-field-label" for="dl-to">Do</label>
            <input class="ht-field" id="dl-to" type="text" autocomplete="off" placeholder="${info.duration ? formatTime(info.duration) : 'koniec'}">
          </div>
        </div>
        <span class="ht-field-error" id="dl-trim-err" role="alert" hidden></span>
      </section>

      ${info.heights.length ? `
      <section class="ht-group" aria-labelledby="dl-g-kind">
        <h3 class="ht-section" id="dl-g-kind">Co pobrać</h3>
        <div class="ht-segmented ht-segmented--icons" role="group" aria-labelledby="dl-g-kind">
          ${KINDS.map(([k, label, ic]) => `
            <button type="button" data-kind="${k}" aria-pressed="${choice.kind === k}">${icon(ic, 'sm')}${label}</button>`).join('')}
        </div>
      </section>` : ''}

      <div id="dl-opts" class="ht-stack"></div>

      <section class="ht-group" aria-labelledby="dl-g-file">
        <h3 class="ht-section" id="dl-g-file">Plik</h3>
        <div id="dl-name-box">
          <button type="button" class="ht-filename" data-dl="rename" aria-label="Zmień nazwę pliku">
            <span class="ht-filename__name" id="dl-name-text">${esc(fileName)}</span>
            <span class="ht-meta" id="dl-ext"></span>
            ${icon('edytuj', 'sm')}
          </button>
        </div>
      </section>

      <div class="ht-dock">
        <button type="button" class="ht-btn ht-btn--primary" data-dl="download" ${load(KEY.job, null) ? 'disabled' : ''}>${icon('pobieranie', 'sm')}<span id="dl-cta">Pobierz</span></button>
      </div>`;
    renderOptions();
    renderPreview();
    syncRange();
  }

  // Grupy zależne od rodzaju: jakość + format (wideo) albo format + bitrate (audio).
  // Jeden typ kontrolki (przełącznik segmentowy); bieżąca wartość i rozmiar w nagłówku grupy.
  function renderOptions() {
    const group = (title, field, items, scroll) => `
      <section class="ht-group" aria-labelledby="dl-g-${field}">
        <div class="ht-section-head">
          <h3 class="ht-section" id="dl-g-${field}">${title}</h3>
          <span class="ht-meta" data-value-of="${field}"></span>
        </div>
        <div class="ht-segmented${scroll ? ' ht-segmented--scroll' : ''}" role="group" aria-labelledby="dl-g-${field}">
          ${items.map(([value, label]) => `
            <button type="button" data-choice="${field}" data-value="${value}" aria-pressed="${String(choice[field]) === String(value)}">${label}</button>`).join('')}
        </div>
      </section>`;
    $('#dl-opts').innerHTML = choice.kind === 'audio'
      ? group('Format', 'format', AUDIO.map((f) => [f, f.toUpperCase()]))
        + (LOSSY.includes(choice.format) ? group('Bitrate', 'bitrate', BITRATES.map((b) => [b, b])) : '')
      : group('Jakość', 'height', info.heights.map((h) => [h, h]), info.heights.length > 5)
        + group('Format', 'container', [['mp4', 'MP4'], ['mkv', 'MKV']]);
    $('#dl-ext').textContent = `.${ext()}`;
    updateSize();
  }

  /* fragment: suwak z dwoma uchwytami ↔ pola Od/Do ↔ podgląd */
  function syncRange(moved) {
    if (!sel) return;
    const range = $('#dl-range');
    const [rf, rt] = [$('#dl-rfrom'), $('#dl-rto')];
    rf.value = sel.from;
    rt.value = sel.to;
    range.style.setProperty('--from', sel.from / sel.max);
    range.style.setProperty('--to', sel.to / sel.max);
    // Uchwyty na jednym torze: gdy „od” dojdzie do końca, musi leżeć na wierzchu, żeby dało się go złapać.
    rf.style.zIndex = sel.from > sel.max * 0.9 ? 2 : '';
    rf.setAttribute('aria-valuetext', formatTime(sel.from));
    rt.setAttribute('aria-valuetext', formatTime(sel.to));
    if (moved !== 'fields') {
      $('#dl-from').value = sel.from > 0 ? formatTime(sel.from) : '';
      $('#dl-to').value = sel.to < sel.max ? formatTime(sel.to) : '';
    }
    updateSize();
  }

  function onRange(e) {
    const which = e.target.id === 'dl-rfrom' ? 'from' : 'to';
    const v = Number(e.target.value);
    if (which === 'from') sel.from = Math.min(v, sel.to - 1);
    else sel.to = Math.max(v, sel.from + 1);
    syncRange();
    preview?.seek(sel[which], which, e.type === 'change');
  }

  // Wpisany czas: poprawny od razu przesuwa suwak, błędny zgłaszamy po wyjściu z pola.
  function onField(e, final) {
    const which = e.target.id === 'dl-from' ? 'from' : 'to';
    const raw = e.target.value.trim();
    const v = toSeconds(raw);
    const trimErr = $('#dl-trim-err');
    if (Number.isNaN(v)) return final && showError(trimErr, 'Wpisz czas jak 1:05 albo 1:02:03.');
    if (!sel) return showError(trimErr, '');
    const val = v ?? (which === 'from' ? 0 : sel.max);
    if (val > sel.max) return final && showError(trimErr, `Materiał trwa ${formatTime(sel.max)}.`);
    if (which === 'from' ? val >= sel.to : val <= sel.from) return final && showError(trimErr, '„Od” musi być wcześniej niż „Do”.');
    showError(trimErr, '');
    sel[which] = val;
    syncRange('fields');
    preview?.seek(val, which, final);
  }

  /* podgląd: odtwarzacz (serwer robi kopię 360p) albo dwie stopklatki */
  let preview = null;

  function renderPreview() {
    const box = $('#dl-preview-box');
    const p = info.preview;
    const src = (path) => `${base()}/preview/${p.id}/${path}`;
    // Bez podglądu (np. sam dźwięk albo brak czasu trwania): sama miniatura, jeśli jest.
    const thumbOnly = () => (info.thumbnail ? `<div class="ht-preview"><img src="${esc(info.thumbnail)}" alt="" referrerpolicy="no-referrer"></div>` : '');
    preview = null;
    if (!sel || !p) return (box.innerHTML = thumbOnly());

    // Znacznik pozycji (linia na torze + pinezka pod nim) ma sens tylko przy odtwarzaczu.
    const headInput = $('#dl-head');
    const headLine = $('#dl-range .ht-range__head');
    const showHead = (on) => {
      headInput.hidden = !on;
      headLine.hidden = !on;
    };
    showHead(false);

    const playBtn = el.querySelector('[data-dl="play"]');
    const frames = () => {
      showHead(false);
      playBtn.hidden = true;
      if (!p.frames) return (box.innerHTML = thumbOnly());
      box.innerHTML = `
        <div class="ht-pair">
          ${['from', 'to'].map((w) => `
            <div class="ht-field-group">
              <div class="ht-preview"><img id="dl-frame-${w}" alt="" src="${src(`frame?t=${sel[w] === sel.max ? Math.max(0, sel[w] - 1) : sel[w]}`)}"></div>
              <span class="ht-caption" id="dl-frame-${w}-t">${w === 'from' ? 'Od' : 'Do'} ${formatTime(sel[w])}</span>
            </div>`).join('')}
        </div>`;
      preview = {
        // Klatka dopiero po puszczeniu uchwytu: każda to ok. 1–2 s pracy komputera.
        seek(t, which, final) {
          $(`#dl-frame-${which}-t`).textContent = `${which === 'from' ? 'Od' : 'Do'} ${formatTime(t)}`;
          if (final) $(`#dl-frame-${which}`).src = src(`frame?t=${which === 'to' && t === sel.max ? Math.max(0, t - 1) : t}`);
        },
      };
    };

    if (!p.video) return frames();
    box.innerHTML = `<div class="ht-preview"><video id="dl-video" playsinline preload="metadata" poster="${esc(info.thumbnail ?? '')}" src="${src('video')}"></video></div>`;
    const video = $('#dl-video');
    playBtn.hidden = false;
    const label = (playing) => {
      playBtn.innerHTML = icon(playing ? 'pauza' : 'odtworz', 'sm');
      playBtn.setAttribute('aria-label', playing ? 'Zatrzymaj' : 'Odtwórz fragment');
    };
    const range = $('#dl-range');
    let scrubbing = false; // palec na pinezce: pozycję ustawia palec, nie odtwarzacz
    let pending = null; // przewinięcie zlecone, zanim odtwarzacz poznał długość filmu

    const setHead = (t) => {
      headInput.value = t;
      range.style.setProperty('--head', t / sel.max);
      headInput.setAttribute('aria-valuetext', formatTime(t));
    };
    // iPhone często nie wczytuje filmu przed pierwszym dotknięciem „play”: wtedy load() i skok po wczytaniu.
    const seekTo = (t) => {
      if (video.readyState >= 1) return (video.currentTime = t);
      pending = t;
      if (video.networkState !== 2) video.load(); // 2 = już się wczytuje
    };
    // W trakcie grania pozycja płynnie, co klatkę (timeupdate daje tylko ok. 4 razy na sekundę).
    const follow = () => {
      if (!scrubbing) setHead(video.currentTime);
      if (!video.paused) requestAnimationFrame(follow);
    };

    video.onloadedmetadata = () => {
      if (pending === null) return;
      video.currentTime = pending;
      pending = null;
    };
    video.onplay = () => {
      label(true);
      requestAnimationFrame(follow);
    };
    video.onpause = () => label(false);
    video.ontimeupdate = () => {
      if (video.currentTime >= sel.to && !video.paused) video.pause();
      if (!scrubbing) setHead(video.currentTime);
    };
    video.onerror = frames; // podgląd się nie udał: stopklatki
    headInput.oninput = () => {
      scrubbing = true;
      video.pause();
      setHead(Number(headInput.value));
      seekTo(Number(headInput.value));
    };
    headInput.onchange = () => (scrubbing = false);
    showHead(true);
    setHead(sel.from);

    preview = {
      seek(t) {
        video.pause();
        setHead(t);
        seekTo(t);
      },
      toggle() {
        if (!video.paused) return video.pause();
        if (video.currentTime < sel.from || video.currentTime >= sel.to - 0.2) video.currentTime = sel.from;
        video.play().catch(() => {});
      },
    };
  }

  /* rozmiar: szacunek z danych serwisu, proporcjonalnie do fragmentu */
  function bytesFor(o) {
    const d = info.duration;
    if (!d) return null;
    if (o.kind === 'audio') return { mp3: o.bitrate, m4a: o.bitrate, flac: 900, wav: 1411 }[o.format] * 125 * d; // kb/s → bajty
    const v = info.video.find((x) => x.height === o.height)?.size;
    return v == null ? null : v + (o.kind === 'video' ? info.audioSize ?? 0 : 0);
  }

  // Wartości w nagłówkach grup, rozmiar na przycisku i długość fragmentu.
  function updateSize() {
    if (!choice || !$('#dl-cta')) return;
    const part = sel ? (sel.to - sel.from) / sel.max : 1;
    const total = bytesFor(choice);
    const size = total ? formatSize(total * part) : null;
    const values = {
      height: [`${choice.height}p`, size].filter(Boolean).join(', '),
      container: choice.container === 'mp4' ? 'Zapis w Zdjęciach' : 'Zapis w Plikach',
      format: LOSSY.includes(choice.format) ? 'Stratny' : ['Bezstratny', size].filter(Boolean).join(', '),
      bitrate: [`${choice.bitrate} kb/s`, size].filter(Boolean).join(', '),
    };
    el.querySelectorAll('[data-value-of]').forEach((s) => (s.textContent = values[s.dataset.valueOf]));
    $('#dl-cta').textContent = size ? `Pobierz (${size})` : 'Pobierz';
    const fragMeta = $('#dl-frag-meta');
    if (fragMeta && sel) {
      fragMeta.textContent = sel.from === 0 && sel.to === sel.max ? 'Cały materiał' : `${formatTime(sel.to - sel.from)} z ${formatTime(sel.max)}`;
    }
  }

  /* pobieranie */
  async function download() {
    const trimErr = $('#dl-trim-err');
    const [a, b] = sel
      ? [sel.from > 0 ? sel.from : null, sel.to < sel.max ? sel.to : null]
      : [toSeconds($('#dl-from').value), toSeconds($('#dl-to').value)];
    if (Number.isNaN(a) || Number.isNaN(b)) return showError(trimErr, 'Wpisz czas jak 1:05 albo 1:02:03.');
    if (a !== null && b !== null && a >= b) return showError(trimErr, '„Od” musi być wcześniej niż „Do”.');
    showError(trimErr, '');

    const c = choice;
    const body = {
      url: info.url, item: info.item ?? undefined, kind: c.kind, height: c.height, container: c.container, format: c.format, bitrate: c.bitrate,
      from: a !== null ? formatTime(a) : '', to: b !== null ? formatTime(b) : '', name: fileName,
    };
    const btn = el.querySelector('[data-dl="download"]');
    btn.disabled = true;
    try {
      const { id } = await api('/jobs', body);
      const label = c.kind === 'audio'
        ? `Audio ${c.format.toUpperCase()}${LOSSY.includes(c.format) ? ` ${c.bitrate} kb/s` : ''}`
        : `${c.kind === 'mute' ? 'Bez dźwięku' : 'Wideo'} ${c.height}p ${c.container.toUpperCase()}`;
      const range = a !== null || b !== null ? `${formatTime(a ?? 0)}–${b !== null ? formatTime(b) : 'koniec'}` : '';
      const job = { id, status: 'running', url: info.url, title: fileName.trim() || info.title, thumbnail: info.thumbnail, label, range, kind: c.kind, container: c.container };
      save(KEY.job, job);
      renderJob(job, { status: 'running', progress: 0, stage: 'download' });
      jobBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
      poll();
    } catch (ex) {
      btn.disabled = false;
      showError(trimErr, ex.message);
    }
  }

  // Etapy: komputer pobiera → komputer obrabia → telefon ściąga plik do pamięci → „Zapisz”.
  function renderJob(job, server) {
    if (!el.isConnected) return;
    jobBox.hidden = false;
    const local = transfer?.id === job.id ? transfer : null;
    const [value, meta] = server.status === 'error' ? ['Błąd', job.title]
      : server.status === 'running' && server.stage === 'processing' ? ['Łączę pliki', 'Na komputerze']
      : server.status === 'running' && server.stage === 'convert' ? [`${server.progress}%`, 'Konwertuję na komputerze']
      : server.status === 'running' ? [`${server.progress}%`, 'Pobieram na komputer']
      : local?.file ? ['Gotowe', job.title]
      : local?.error ? ['Błąd', job.title]
      : [`${local?.progress ?? 0}%`, 'Przesyłam na telefon'];
    const live = server.status === 'running' || (server.status === 'done' && !local?.file && !local?.error);
    const toPhotos = job.kind !== 'audio' && job.container !== 'mkv';
    jobBox.innerHTML = `
      <div class="ht-card-sm">
        <span class="ht-card-sm__top">${icon('pobieranie', 'md')}${live ? '<span class="ht-dot ht-dot--live" role="img" aria-label="Pobieranie trwa"></span>' : ''}</span>
        <span class="ht-card-sm__text"><span class="ht-value">${value}</span><span class="ht-meta">${esc(meta)}</span></span>
      </div>
      ${server.status === 'error' ? `<span class="ht-field-error" role="alert">${esc(server.error)}</span>` : ''}
      ${local?.error ? `<span class="ht-field-error" role="alert">${esc(local.error)}</span>
        ${local.tooBig
          ? `<a class="ht-btn ht-btn--secondary" href="${esc(fileUrl(job))}" target="_blank" rel="noopener">Otwórz w Safari</a>`
          : '<button type="button" class="ht-btn ht-btn--secondary" data-dl="refetch">Spróbuj ponownie</button>'}` : ''}
      ${local?.file ? `
        <button type="button" class="ht-btn ht-btn--primary" data-dl="save">${icon('pobieranie', 'sm')}Zapisz</button>
        ${IOS ? `<span class="ht-caption">W oknie Udostępnij wybierz „${toPhotos ? 'Zachowaj wideo' : 'Zachowaj w Plikach'}”${toPhotos ? ', żeby trafiło do Zdjęć' : ''}.</span>` : ''}` : ''}`;
    if (local?.file && !local.shown) {
      local.shown = true; // raz: pokaż „Zapisz”, który mógł zostać pod paskiem
      jobBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  async function poll() {
    const job = load(KEY.job, null);
    if (!job || !el.isConnected) return;
    let server;
    try {
      server = await api(`/jobs/${job.id}`);
    } catch (ex) {
      if (ex.status === 404) server = { status: 'error', error: ex.message };
      else {
        renderJob(job, { status: 'error', error: ex.message });
        return setTimeout(poll, POLL_MS * 5); // chwilowy brak sieci: spróbuj ponownie wolniej
      }
    }
    renderJob(job, server);
    if (server.status === 'running') return setTimeout(poll, POLL_MS);

    if (server.status === 'done' && job.status !== 'done') {
      save(KEY.job, { ...job, status: 'done' });
      const entry = { url: job.url, title: job.title, thumbnail: job.thumbnail, label: job.label, range: job.range, date: Date.now() };
      save(KEY.history, [entry, ...load(KEY.history, [])].slice(0, HISTORY_MAX));
      renderHistory();
    }
    if (server.status === 'error') {
      save(KEY.job, null);
      const btn = el.querySelector('[data-dl="download"]');
      if (btn) btn.disabled = false;
    }
    if (server.status === 'done') {
      if (transfer?.id !== job.id) fetchFile(job);
      transfer.update = () => renderJob(job, server); // także po powrocie na ekran w trakcie przesyłania
    }
  }

  // Zadanie zamknięte (plik zapisany): czyść i odblokuj „Pobierz”.
  function finish() {
    save(KEY.job, null);
    transfer = null;
    jobBox.hidden = true;
    const btn = el.querySelector('[data-dl="download"]');
    if (btn) btn.disabled = false;
  }

  function saveFile() {
    // Musi ruszyć od razu w tym dotknięciu: Safari pozwala otworzyć Udostępnij tylko ok. 5 s po nim.
    const { file } = transfer;
    if (IOS) {
      // MKV i inne nietypowe pliki iPhone udostępnia tylko jako „zwykły plik”.
      const shareable = [file, new File([file], file.name, { type: 'application/octet-stream' })].find((f) => navigator.canShare?.({ files: [f] }));
      if (shareable) {
        if (transfer.sharing) return; // drugie dotknięcie przy otwartym oknie Udostępnij
        transfer.sharing = true;
        navigator.share({ files: [shareable] })
          .then(finish, (ex) => {
            if (ex.name !== 'AbortError') jobBox.insertAdjacentHTML('beforeend', `<span class="ht-field-error" role="alert">Nie udało się zapisać: ${esc(ex.message)}</span>`);
          })
          .finally(() => transfer && (transfer.sharing = false));
        return;
      }
    }
    // Android i komputer: zwykłe pobranie pliku z pamięci.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    finish();
  }

  /* historia */
  function renderHistory() {
    const box = $('#dl-history');
    const list = load(KEY.history, []);
    box.hidden = !list.length;
    box.innerHTML = `
      <div class="ht-section-head">
        <h2 class="ht-section" id="dl-h">Historia</h2>
        <button type="button" class="ht-btn-text" data-dl="clear">Wyczyść</button>
      </div>
      ${list.map((h, i) => `
        <button type="button" class="ht-card" data-history="${i}">
          <span class="ht-well">${h.thumbnail ? `<img src="${esc(h.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : icon('pobieranie', 'md')}</span>
          <span class="ht-card__text">
            <span class="ht-card-title">${esc(h.title)}</span>
            <span class="ht-caption">${esc([h.label, h.range, new Date(h.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' })].filter(Boolean).join(' · '))}</span>
          </span>
          ${icon('dalej', 'sm', 'ht-card__chevron')}
        </button>`).join('')}`;
  }

  /* zdarzenia */
  urlField.oninput = () => ($('#dl-check').className = 'ht-btn ht-btn--primary'); // nowy link: znów akcja główna
  // Wklejenie przytrzymaniem pola (menu iPhone'a) od razu sprawdza link.
  urlField.onpaste = () => setTimeout(() => urlField.value.trim() && check());
  el.onsubmit = (e) => {
    e.preventDefault();
    check();
  };
  el.oninput = (e) => {
    if (e.target.id === 'dl-rfrom' || e.target.id === 'dl-rto') onRange(e);
    if (e.target.id === 'dl-from' || e.target.id === 'dl-to') onField(e, false);
    if (e.target.id === 'dl-name') fileName = e.target.value;
  };
  el.onchange = (e) => {
    const t = e.target;
    if (t.id === 'dl-rfrom' || t.id === 'dl-rto') onRange(e);
    if (t.id === 'dl-from' || t.id === 'dl-to') onField(e, true);
  };
  el.onclick = async (e) => {
    const t = e.target.closest('[data-dl], [data-kind], [data-choice], [data-history], [data-video], [data-photo]');
    if (t?.dataset.choice) {
      const field = t.dataset.choice;
      choice[field] = field === 'height' || field === 'bitrate' ? Number(t.dataset.value) : t.dataset.value;
      if (field === 'format') return renderOptions(); // bitrate tylko dla MP3/M4A
      t.parentElement.querySelectorAll('[data-choice]').forEach((b) => b.setAttribute('aria-pressed', b === t));
      $('#dl-ext').textContent = `.${ext()}`;
      return updateSize();
    }
    if (!t) return;
    if (t.dataset.video) return check(Number(t.dataset.video));
    if (t.dataset.photo) {
      const n = Number(t.dataset.photo);
      picked.selected.has(n) ? picked.selected.delete(n) : picked.selected.add(n);
      t.setAttribute('aria-pressed', picked.selected.has(n));
      if (photoState.status !== 'fetching') photoState = { status: 'idle' }; // zmiana wyboru: pobierz od nowa
      const all = el.querySelector('[data-dl="all"]');
      if (all) all.textContent = `${picked.selected.size ? 'Odznacz' : 'Zaznacz'} wszystkie`;
      return renderPhotoAction();
    }
    if (t.dataset.kind) {
      choice.kind = t.dataset.kind;
      el.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', b === t));
      return renderOptions();
    }
    if (t.dataset.history) {
      urlField.value = load(KEY.history, [])[t.dataset.history].url;
      $('#dl-check').className = 'ht-btn ht-btn--primary';
      window.scrollTo(0, 0);
      return check();
    }
    const action = t.dataset.dl;
    if (action === 'download') download();
    if (action === 'rename') {
      // Wiersz z nazwą zamienia się w pole; rozszerzenie zostaje z prawej, dopisze się samo.
      $('#dl-name-box').innerHTML = `
        <div class="ht-field-wrap">
          <label class="ht-sr-only" for="dl-name">Nazwa pliku</label>
          <input class="ht-field" id="dl-name" type="text" autocomplete="off" value="${esc(fileName)}" style="padding-right:84px">
          <span class="ht-field__action ht-meta" id="dl-ext" style="display:flex; align-items:center; pointer-events:none">.${ext()}</span>
        </div>`;
      const f = $('#dl-name');
      f.focus();
      f.select();
    }
    if (action === 'photos') fetchPhotos();
    if (action === 'photos-save') savePhotos();
    if (action === 'all') {
      const selectAll = picked.selected.size === 0;
      picked.selected = new Set(selectAll ? Array.from({ length: picked.photos }, (_, i) => i) : []);
      photoState = { status: 'idle' };
      el.querySelectorAll('[data-photo]').forEach((b) => b.setAttribute('aria-pressed', selectAll));
      t.textContent = `${selectAll ? 'Odznacz' : 'Zaznacz'} wszystkie`;
      renderPhotoAction();
    }
    if (action === 'play') preview?.toggle?.();
    if (action === 'save') saveFile();
    if (action === 'refetch') {
      const job = load(KEY.job, null);
      transfer = null;
      if (job) poll();
    }
    if (action === 'clear' && confirm('Wyczyścić historię pobrań?')) {
      save(KEY.history, []);
      renderHistory();
    }
    if (action === 'paste') {
      try {
        const url = await readClipboard();
        if (!url) throw new Error('pusto');
        urlField.value = url;
        check();
      } catch {
        showError($('#dl-err'), 'iPhone nie dał dostępu do schowka. Dotknij dymka „Wklej” nad przyciskiem albo przytrzymaj pole i wybierz Wklej.');
        urlField.focus();
      }
    }
  };

  renderHistory();
  poll(); // wznów pobieranie, które trwało, gdy zamknąłeś narzędzie
}
