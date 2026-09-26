// Narzędzie „Pomocnik Remote”: podgląd bazy Pomocnika List Sprzętu z telefonu, tylko odczyt
// (spec: .scratch/pomocnik-remote/spec.md). Widoczne w menu dopiero po zalogowaniu w Koncie.
import { icon } from '../icons.js';
import { esc } from '../html.js';
import { zalogowany, zapisane, pobierz } from './pomocnik/dane.js';
import { nrm, dzisISO, zakresDat, grupujListy, wOknie, podsumowanie, poMagazynach } from './pomocnik/model.js';

export { zalogowany };

// Wybory ekranu: przetrwają wejście w listę i powrót, a widok i okno dni też zamknięcie aplikacji.
const UI_KEY = 'ht.pomocnik.ui';
const ui = { widok: 'listy', dni: 7, uklad: 'lista', stan: 'wszystko', q: '', rodzaj: '', tag: '' };
try {
  Object.assign(ui, JSON.parse(localStorage.getItem(UI_KEY)), { q: '', rodzaj: '', tag: '' });
} catch { /* bez zapisanych wyborów */ }
const saveUi = () => {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ widok: ui.widok, dni: ui.dni, uklad: ui.uklad, stan: ui.stan }));
  } catch { /* bez zapisu */ }
};

const idListy = () => decodeURIComponent(location.hash.split('/')[3] ?? '');
const godzina = (t) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dzienGodzina = (t) => (dzisISO(new Date(t)) === dzisISO() ? godzina(t) : `${new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}, ${godzina(t)}`);
const plural = (n, [one, few, many]) => `${n} ${n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many}`;
const POZ = ['pozycja', 'pozycje', 'pozycji'];
const LIST = ['lista', 'listy', 'list'];

// Tytuł ekranu: nazwa listy w szczegółach.
export const title = (id) => (id && zapisane()?.listy.find((l) => l.id === decodeURIComponent(id))?.nazwa) || 'Pomocnik List Sprzętu';

let pobrane = 0; // kiedy ostatnio pytaliśmy bazę (odświeżanie przy wejściu, najwyżej co 30 s)

export function render(el) {
  if (!zalogowany()) {
    el.innerHTML = `
      <div class="ht-section-block">
        <div class="ht-empty">
          <span class="ht-well">${icon('konto', 'md')}</span>
          <p class="ht-card-title">Zaloguj się kontem z Pomocnika</p>
          <p class="ht-lead">Listy i sprzęt pokażą się po zalogowaniu w Koncie.</p>
        </div>
        <a class="ht-btn ht-btn--primary" href="#/konto">${icon('konto', 'sm')}Przejdź do Konta</a>
      </div>`;
    return;
  }

  let dane = zapisane();
  let blad = '';
  let laduje = false;
  const id = idListy();

  el.innerHTML = '<div class="ht-section-block ht-stack" id="pl"></div>';
  const box = el.querySelector('#pl');

  async function odswiez() {
    laduje = true;
    przerysuj();
    try {
      dane = await pobierz();
      blad = '';
      pobrane = Date.now();
    } catch (ex) {
      blad = ex.message;
    }
    laduje = false;
    if (!zalogowany()) return render(el); // sesja wygasła
    if (el.isConnected) przerysuj();
  }

  // Po odświeżeniu tylko stan i wyniki: pole wyszukiwania zostaje, klawiatura się nie chowa.
  function przerysuj() {
    const st = box.querySelector('#p-status');
    if (!st || id || !box.querySelector('#p-wynik')) return draw();
    st.outerHTML = statusHtml();
    wynik();
  }

  const statusHtml = () => `
    <div class="ht-section-head" id="p-status">
      ${blad ? `<span class="ht-field-error" role="alert">${esc(blad)} Stan z ${dzienGodzina(dane.czas)}.</span>`
        : `<span class="ht-caption" role="status">${laduje ? 'Odświeżam…' : `Stan z ${dzienGodzina(dane.czas)}`}</span>`}
      <button type="button" class="ht-btn-text" data-p="odswiez" ${laduje ? 'disabled' : ''}>Odśwież</button>
    </div>`;

  /* --- widok ----------------------------------------------------------------- */

  function draw() {
    if (!dane) {
      box.innerHTML = blad
        ? `<span class="ht-field-error" role="alert">${esc(blad)}</span><button type="button" class="ht-btn ht-btn--secondary" data-p="odswiez">Spróbuj ponownie</button>`
        : '<p class="ht-lead" role="status">Pobieram dane z Pomocnika…</p>';
      return;
    }
    const status = statusHtml();

    if (id) {
      const l = dane.listy.find((x) => x.id === id);
      box.innerHTML = status + (l ? listaHtml(l) : '<p class="ht-lead">Tej listy już nie ma w Pomocniku.</p>');
      return;
    }
    box.innerHTML = `
      ${status}
      ${seg('widok', [['listy', 'Listy'], ['sprzet', 'Sprzęt'], ['dni', 'Najbliższe dni']], 'Widok')}
      ${ui.widok === 'dni' ? '' : `
      <div class="ht-field-wrap">
        <label class="ht-sr-only" for="p-q">Szukaj</label>
        ${icon('szukaj', 'sm', 'ht-field__icon')}
        <input class="ht-field ht-field--search" id="p-q" type="search" placeholder="${ui.widok === 'listy' ? 'Szukaj listy' : 'Szukaj sprzętu'}" autocomplete="off" value="${esc(ui.q)}">
      </div>`}
      ${filtryHtml()}
      <div class="ht-stack" id="p-wynik"></div>`;
    wynik();
  }

  // Przełącznik: [wartość, etykieta]; `klucz` to pole w `ui`.
  function seg(klucz, opcje, nazwa, scroll = false) {
    return `
      <div class="ht-segmented${scroll ? ' ht-segmented--scroll' : ''}" role="group" aria-label="${nazwa}">
        ${opcje.map(([v, l]) => `<button type="button" data-p-${klucz}="${esc(v)}" aria-pressed="${String(ui[klucz]) === String(v)}">${esc(l)}</button>`).join('')}
      </div>`;
  }

  function filtryHtml() {
    if (ui.widok === 'listy' && dane.rodzaje.length) return seg('rodzaj', [['', 'Wszystkie'], ...dane.rodzaje.map((r) => [r, r])], 'Rodzaj', true);
    if (ui.widok === 'sprzet') {
      return `${seg('stan', [['wszystko', 'Cały sprzęt'], ['stan', 'Ze stanem']], 'Stan')}
        ${dane.tagi.length ? seg('tag', [['', 'Wszystkie tagi'], ...dane.tagi.map((t) => [t, t])], 'Tag', true) : ''}`;
    }
    if (ui.widok === 'dni') return seg('dni', [[7, '7 dni'], [14, '14 dni'], [30, '30 dni']], 'Okno');
    return '';
  }

  // Wyniki rysowane osobno: pisanie w wyszukiwarce nie przerysowuje pola (nie gubi fokusu).
  function wynik() {
    const out = box.querySelector('#p-wynik');
    if (!out) return;
    out.innerHTML = ui.widok === 'listy' ? listyHtml() : ui.widok === 'sprzet' ? sprzetHtml() : dniHtml();
  }

  const group = (title, meta, body) => `
    <section class="ht-group">
      <div class="ht-section-head"><h3 class="ht-section">${esc(title)}</h3><span class="ht-meta">${meta}</span></div>
      ${body}
    </section>`;

  const brak = (tekst) => `<p class="ht-lead">${tekst}</p>`;

  /* --- listy ------------------------------------------------------------------ */

  const stanListy = (l) => (l.zaladowana ? 'Na busie' : l.naszykowana ? 'Naszykowana' : '');

  const wierszListy = (l) => `
    <li class="ht-row"><a class="ht-row__main" href="#/narzedzie/pomocnik/${encodeURIComponent(l.id)}">
      <span class="ht-row__name">
        <span>${esc(l.nazwa)}</span>
        <span class="ht-caption">${[zakresDat(l.data, l.dataDo), l.rodzaj, plural(l.pozycje.length, POZ)].filter(Boolean).map(esc).join(' · ')}</span>
      </span>
      <span class="ht-row__state">${stanListy(l)}</span>
      <span class="ht-row__chevron">${icon('dalej', 'sm')}</span>
    </a></li>`;

  function listyHtml() {
    const q = nrm(ui.q);
    const ls = dane.listy.filter((l) => (!ui.rodzaj || l.rodzaj === ui.rodzaj) && (!q || nrm(l.nazwa).includes(q)));
    const g = grupujListy(ls, dzisISO());
    const sekcje = [['Nadchodzące', g.nadchodzace], ['Archiwum', g.archiwum], ['Bez daty', g.bezDaty]].filter(([, x]) => x.length);
    return sekcje.length
      ? sekcje.map(([t, x]) => group(t, plural(x.length, LIST), `<ul class="ht-rows">${x.map(wierszListy).join('')}</ul>`)).join('')
      : brak(q || ui.rodzaj ? 'Żadna lista nie pasuje.' : 'W Pomocniku nie ma jeszcze list.');
  }

  function listaHtml(l) {
    const autor = dane.autorzy[l.autor];
    const info = [
      ['Termin', zakresDat(l.data, l.dataDo) || 'Bez daty'],
      ['Rodzaj', l.rodzaj],
      ['Autor', autor],
      ['Stan', [l.naszykowana && 'Sprzęt naszykowany', l.zaladowana && 'Na busie'].filter(Boolean).join(', ') || 'Nie naszykowana'],
    ].filter(([, v]) => v);
    const poz = (p) => {
      const uwagi = [p.uwagi, p.flaga && l.drukFlagi && '*Do potwierdzenia'].filter(Boolean).join(' · ');
      return `
        <li class="ht-row">
          <span class="ht-row__name">
            <span>${esc(p.nazwa)}</span>
            ${uwagi ? `<span class="ht-caption ht-uwagi">${esc(uwagi)}</span>` : ''}
          </span>
          <span class="ht-row__state ht-ilosc">${esc(p.ilosc)}</span>
        </li>`;
    };
    const lista = ui.uklad === 'magazyny'
      ? poMagazynach(l.pozycje, dane.magazyny, { zachowaj: true }).map((g) => group(g.nazwa, plural(g.elementy.length, POZ), `<ul class="ht-rows">${g.elementy.map(poz).join('')}</ul>`)).join('')
      : group('Sprzęt', plural(l.pozycje.length, POZ), `<ul class="ht-rows">${l.pozycje.map(poz).join('')}</ul>`);
    return `
      <section class="ht-group">
        <ul class="ht-rows">
          ${info.map(([k, v]) => `<li class="ht-row"><span class="ht-row__name"><span class="ht-row__label">${k}</span></span><span class="ht-row__state ht-row__value">${esc(v)}</span></li>`).join('')}
        </ul>
        ${l.opis ? `<p class="ht-lead" style="white-space:pre-line">${esc(l.opis)}</p>` : ''}
      </section>
      ${l.pozycje.length ? `${seg('uklad', [['lista', 'Kolejność z listy'], ['magazyny', 'Po magazynach']], 'Układ')}${lista}` : brak('Ta lista nie ma pozycji.')}`;
  }

  /* --- sprzęt ----------------------------------------------------------------- */

  function sprzetHtml() {
    const q = nrm(ui.q);
    const sp = dane.sprzet.filter((s) => (ui.stan !== 'stan' || s.stan !== null)
      && (!ui.tag || s.tagi.includes(ui.tag))
      && (!q || nrm(s.nazwa).includes(q) || nrm(s.alias).includes(q)));
    const grupy = poMagazynach(sp, dane.magazyny);
    const row = (s) => {
      const opis = [s.alias, s.uwaga].filter(Boolean).join(' · ');
      return `
        <li class="ht-row">
          <span class="ht-row__name"><span>${esc(s.nazwa)}</span>${opis ? `<span class="ht-caption">${esc(opis)}</span>` : ''}</span>
          <span class="ht-row__state ht-ilosc" ${s.stan === null ? 'aria-label="Brak stanu"' : ''}>${s.stan === null ? '—' : esc(String(s.stan).replace('.', ','))}</span>
        </li>`;
    };
    return grupy.length
      ? grupy.map((g) => group(g.nazwa, plural(g.elementy.length, POZ), `<ul class="ht-rows">${g.elementy.map(row).join('')}</ul>`)).join('')
      : brak('Nic nie pasuje.');
  }

  /* --- najbliższe dni ------------------------------------------------------------ */

  function dniHtml() {
    const ls = wOknie(dane.listy, dzisISO(), Number(ui.dni));
    if (!ls.length) return brak(`Brak list w najbliższych ${ui.dni} dniach.`);
    const rows = podsumowanie(ls, dane.sprzet);
    const braki = rows.filter((r) => r.brak).length;
    const row = (r) => `
      <li class="ht-row">
        <span class="ht-row__name">
          <span>${esc(r.nazwa)}</span>
          <span class="ht-caption">${esc(r.zrodla.map((z) => `${z.lista}: ${z.ilosc}`).join(' · '))}</span>
        </span>
        <span class="ht-row__state ht-ilosc">${r.brak ? `<span class="ht-field-error">${esc(r.ilosc)} z ${r.stan}</span>` : `${esc(r.ilosc)}${r.stan !== null ? `<span class="ht-caption"> z ${r.stan}</span>` : ''}`}</span>
      </li>`;
    return `
      ${group('Listy', plural(ls.length, LIST), `<ul class="ht-rows">${ls.map(wierszListy).join('')}</ul>`)}
      ${braki ? `<span class="ht-field-error" role="alert">Na stanie brakuje: ${plural(braki, POZ)}.</span>` : ''}
      ${poMagazynach(rows, dane.magazyny).map((g) => group(g.nazwa, plural(g.elementy.length, POZ), `<ul class="ht-rows">${g.elementy.map(row).join('')}</ul>`)).join('')}`;
  }

  /* --- zdarzenia ----------------------------------------------------------- */

  el.oninput = (e) => {
    if (e.target.id !== 'p-q') return;
    ui.q = e.target.value;
    wynik();
  };
  el.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.p === 'odswiez') return odswiez();
    const [klucz] = Object.keys(t.dataset).filter((k) => k.startsWith('p') && k !== 'p').map((k) => k.slice(1).toLowerCase());
    if (!klucz || !(klucz in ui)) return;
    ui[klucz] = t.dataset[`p${klucz[0].toUpperCase()}${klucz.slice(1)}`];
    if (klucz === 'widok') ui.q = '';
    saveUi();
    draw();
  };

  draw();
  if (!dane || Date.now() - pobrane > 30_000) odswiez();
}
