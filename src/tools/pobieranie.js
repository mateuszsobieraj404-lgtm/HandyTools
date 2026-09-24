// Narzędzie „Pobieranie”: wideo i audio z linku przez serwer na komputerze (server/server.js).
// Spec: .scratch/pobieranie/spec.md
import { icon } from '../icons.js';
import { esc } from '../html.js';
import { toSeconds, formatTime } from '../time.js';

const KEY = { cfg: 'ht.pobieranie.serwer', history: 'ht.pobieranie.historia', job: 'ht.pobieranie.zadanie' };
const HISTORY_MAX = 20;
const POLL_MS = 1000;

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

const plural = (n) => (n === 1 ? 'pobranie' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'pobrania' : 'pobrań');
const base = (cfg) => cfg.url.replace(/\/+$/, '');

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
  load(KEY.cfg, null) ? main(el) : settings(el);
}

/* --- ustawienia serwera --------------------------------------------------- */

function settings(el) {
  const cfg = load(KEY.cfg, { url: '', password: '' });
  el.innerHTML = `
    <form class="ht-section-block" id="dl-settings" novalidate>
      <p class="ht-lead">Pobieranie idzie przez serwer na Twoim komputerze. Wpisz jego adres i hasło z pliku <code>server/.env</code>.</p>
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
      </div>
      <button class="ht-btn ht-btn--primary" type="submit">Zapisz</button>
      ${cfg.url ? '<button class="ht-btn ht-btn--secondary" type="button" data-dl="back">Anuluj</button>' : ''}
    </form>`;

  const err = el.querySelector('#dl-set-err');
  el.onclick = (e) => {
    const t = e.target.closest('[data-dl]');
    if (t?.dataset.dl === 'reveal') {
      const f = el.querySelector('#dl-pass');
      f.type = f.type === 'password' ? 'text' : 'password';
      t.textContent = f.type === 'password' ? 'Pokaż' : 'Ukryj';
    }
    if (t?.dataset.dl === 'back') main(el);
  };
  el.onsubmit = async (e) => {
    e.preventDefault();
    const next = { url: el.querySelector('#dl-server').value.trim(), password: el.querySelector('#dl-pass').value };
    err.hidden = true;
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
      main(el);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Zapisz';
    }
  };
}

/* --- główny widok ---------------------------------------------------------- */

function main(el) {
  let info = null; // wynik /info dla bieżącego linku
  let type = 'video';

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
    <section class="ht-section-block" id="dl-result" aria-live="polite" hidden></section>
    <section class="ht-section-block" id="dl-job" aria-live="polite" hidden></section>
    <section class="ht-section-block" id="dl-history" aria-labelledby="dl-h" hidden></section>
    <div class="ht-section-block">
      <button type="button" class="ht-btn-text" data-dl="settings" style="align-self:flex-start">Ustawienia serwera</button>
    </div>`;

  const $ = (sel) => el.querySelector(sel);
  const urlField = $('#dl-url');
  const result = $('#dl-result');
  const jobBox = $('#dl-job');

  const showError = (box, msg) => {
    box.textContent = msg;
    box.hidden = !msg;
  };

  /* sprawdzenie linku */
  async function check() {
    const url = urlField.value.trim();
    showError($('#dl-err'), '');
    if (!url) return showError($('#dl-err'), 'Wklej link.');
    result.hidden = false;
    result.innerHTML = '<div class="ht-card ht-skeleton" style="height:var(--ht-tile)" role="status" aria-label="Sprawdzam link"></div>';
    $('#dl-check').disabled = true;
    try {
      info = await api('/info', { url });
      type = info.heights.length ? 'video' : 'audio';
      $('#dl-check').className = 'ht-btn ht-btn--secondary'; // akcją główną jest teraz „Pobierz”
      renderOptions();
    } catch (ex) {
      result.hidden = true;
      showError($('#dl-err'), ex.message);
    } finally {
      $('#dl-check').disabled = false;
    }
  }

  function renderOptions() {
    const meta = [info.site, info.duration && formatTime(info.duration)].filter(Boolean).join(' · ');
    const quality = type === 'video'
      ? info.heights.map((h) => `<option value="${h}">${h}p</option>`).join('')
      : '<option value="mp3">MP3</option><option value="m4a">M4A (lepsza jakość, mniejszy plik)</option>';
    result.innerHTML = `
      <div class="ht-card">
        <span class="ht-well">${info.thumbnail ? `<img src="${esc(info.thumbnail)}" alt="" referrerpolicy="no-referrer">` : icon('pobieranie', 'md')}</span>
        <span class="ht-card__text"><span class="ht-card-title">${esc(info.title)}</span><span class="ht-caption">${esc(meta)}</span></span>
      </div>
      ${info.heights.length ? `
      <div class="ht-segmented" role="tablist" aria-label="Rodzaj pliku">
        <button type="button" class="ht-hit" role="tab" data-type="video" aria-selected="${type === 'video'}">Wideo</button>
        <button type="button" class="ht-hit" role="tab" data-type="audio" aria-selected="${type === 'audio'}">Audio</button>
      </div>` : ''}
      <div class="ht-field-group">
        <label class="ht-field-label" for="dl-quality">${type === 'video' ? 'Jakość' : 'Format'}</label>
        <select class="ht-field" id="dl-quality">${quality}</select>
      </div>
      <div class="ht-pair">
        <div class="ht-field-group">
          <label class="ht-field-label" for="dl-from">Od</label>
          <input class="ht-field" id="dl-from" type="text" autocomplete="off" placeholder="0:00">
        </div>
        <div class="ht-field-group">
          <label class="ht-field-label" for="dl-to">Do</label>
          <input class="ht-field" id="dl-to" type="text" autocomplete="off" placeholder="${info.duration ? formatTime(info.duration) : 'koniec'}">
        </div>
      </div>
      <span class="ht-caption">Puste pola: cały materiał. Czas jak 1:05 albo 1:02:03.</span>
      <span class="ht-field-error" id="dl-trim-err" role="alert" hidden></span>
      <button type="button" class="ht-btn ht-btn--primary" data-dl="download" ${load(KEY.job, null) ? 'disabled' : ''}>${icon('pobieranie', 'sm')}Pobierz</button>`;
  }

  /* pobieranie */
  async function download() {
    const from = $('#dl-from').value.trim();
    const to = $('#dl-to').value.trim();
    const [a, b] = [toSeconds(from), toSeconds(to)];
    const trimErr = $('#dl-trim-err');
    if (Number.isNaN(a) || Number.isNaN(b)) return showError(trimErr, 'Wpisz czas jak 1:05 albo 1:02:03.');
    if (a !== null && b !== null && a >= b) return showError(trimErr, '„Od” musi być wcześniej niż „Do”.');
    if (info.duration && (a ?? 0) >= info.duration) return showError(trimErr, `Materiał trwa ${formatTime(info.duration)}.`);
    if (info.duration && b !== null && b > info.duration) return showError(trimErr, `Materiał trwa ${formatTime(info.duration)}.`);
    showError(trimErr, '');

    const q = $('#dl-quality').value;
    const body = type === 'video'
      ? { url: info.url, type, format: 'mp4', height: Number(q) }
      : { url: info.url, type, format: q };
    Object.assign(body, { from, to });

    const btn = el.querySelector('[data-dl="download"]');
    btn.disabled = true;
    try {
      const { id } = await api('/jobs', body);
      const label = type === 'video' ? `Wideo ${q}p` : `Audio ${q.toUpperCase()}`;
      const range = a !== null || b !== null ? `${formatTime(a ?? 0)}–${b !== null ? formatTime(b) : 'koniec'}` : '';
      const job = { id, status: 'running', url: info.url, title: info.title, thumbnail: info.thumbnail, label, range };
      save(KEY.job, job);
      renderJob(job, { status: 'running', progress: 0, stage: 'download' });
      jobBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
      poll();
    } catch (ex) {
      btn.disabled = false;
      showError(trimErr, ex.message);
    }
  }

  function renderJob(job, server) {
    jobBox.hidden = false;
    const value = server.status === 'done' ? 'Gotowe'
      : server.status === 'error' ? 'Błąd'
      : server.stage === 'processing' ? 'Łączę pliki' : `${server.progress}%`;
    jobBox.innerHTML = `
      <div class="ht-card-sm">
        <span class="ht-card-sm__top">${icon('pobieranie', 'md')}${server.status === 'running' ? '<span class="ht-dot ht-dot--live" role="img" aria-label="Pobieranie trwa"></span>' : ''}</span>
        <span class="ht-card-sm__text"><span class="ht-value">${value}</span><span class="ht-meta">${esc(job.title)}</span></span>
      </div>
      ${server.status === 'error' ? `<span class="ht-field-error" role="alert">${esc(server.error)}</span>` : ''}
      ${server.status === 'done' ? `<a class="ht-btn ht-btn--primary" href="${esc(base(load(KEY.cfg, {})))}/jobs/${esc(job.id)}/file" data-dl="saved">${icon('pobieranie', 'sm')}Zapisz plik</a>` : ''}`;
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
    if (server.status === 'error') save(KEY.job, null);
    const btn = el.querySelector('[data-dl="download"]');
    if (btn && server.status === 'error') btn.disabled = false;
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
  el.onsubmit = (e) => {
    e.preventDefault();
    check();
  };
  el.onclick = async (e) => {
    const t = e.target.closest('[data-dl], [data-type], [data-history]');
    if (!t) return;
    if (t.dataset.type) {
      type = t.dataset.type;
      return renderOptions();
    }
    if (t.dataset.history) {
      urlField.value = load(KEY.history, [])[t.dataset.history].url;
      $('#dl-check').className = 'ht-btn ht-btn--primary';
      window.scrollTo(0, 0);
      return check();
    }
    const action = t.dataset.dl;
    if (action === 'settings') settings(el);
    if (action === 'download') download();
    if (action === 'saved') {
      // Link robi swoje (przeglądarka zapisuje plik); zadanie jest zamknięte.
      save(KEY.job, null);
      setTimeout(() => {
        jobBox.hidden = true;
        const btn = el.querySelector('[data-dl="download"]');
        if (btn) btn.disabled = false;
      });
    }
    if (action === 'clear' && confirm('Wyczyścić historię pobrań?')) {
      save(KEY.history, []);
      renderHistory();
    }
    if (action === 'paste') {
      try {
        urlField.value = (await navigator.clipboard.readText()).trim();
        check();
      } catch {
        showError($('#dl-err'), 'Brak dostępu do schowka. Wklej link ręcznie.');
        urlField.focus();
      }
    }
  };

  renderHistory();
  poll(); // wznów pobieranie, które trwało, gdy zamknąłeś narzędzie
}
