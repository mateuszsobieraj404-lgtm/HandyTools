// Wydruk listy wyglądający jak w Pomocniku List Sprzętu, jako PDF do udostępnienia (np. do aplikacji Canon PRINT):
// aplikacja z ekranu głównego iPhone'a nie drukuje sama.
// Przeniesione z Pomocnika: HTML i podział na strony z `buildPrintDoc` (js/druk.js), komórki z `drukRowHtml`
// i ustawienia layoutu (js/core.js), style z sekcji „wydruk” w style.css. Strony renderuje przeglądarka
// tak jak w Pomocniku, html2canvas robi z nich obrazy, pdf-lib składa je w A4 z marginesami z `@page`.
import { esc } from '../../html.js';

// Ustawienia wydruku z Pomocnika na komputerze. Pomocnik trzyma je w pliku lokalnym, nie w chmurze,
// więc są przepisane: aktywny layout „Nowy 1” i paleta kolorów list.
// ponytail: kopia z 27.09.2026; po zmianie layoutu albo palety w Pomocniku przepisać tutaj
// (albo przenieść je w Pomocniku do tabeli `konfiguracja`, wtedy HandyTools pobierze je samo).
const UKLAD = {
  kolumny: [
    { id: 'k_rodzaj', typ: 'rodzaj', nazwa: 'Rodzaj sprzętu', szer: 36, cls: 't-rodzaj' },
    { id: 'k_ilosc', typ: 'ilosc', nazwa: 'Ilość do spakowania', szer: 15, cls: 't-ilosc' },
    { id: 'k_nasz', typ: 'pusta', nazwa: 'Naszykowano', szer: 15, cls: 't-nasz' },
    { id: 'k_braki', typ: 'pusta', nazwa: 'Braki', szer: 11, cls: 't-braki' },
    { id: 'k_uwagi', typ: 'uwagi', nazwa: 'Uwagi', szer: 23, cls: 't-uwagi' },
  ],
  scalenia: [],
  wysWiersza: 7, wysNaglowka: 8, padPion: 2, padPoziom: 5,
  fontNazwa: 11, fontIlosc: 11, fontUwagi: 9, fontNaglowki: 11, fontTytul: 20,
  kolorUwag: '#c00', gruboscLinii: 1,
  pokazStempel: true, pokazPodpis: true, pokazStopke: true, wypelniacze: true,
};
const PALETA = ['#cfe79f', '#b1e6e4', '#ebc1dd', '#e3b7e6', '#e7da9d', '#b2e0ed', '#eab6d5', '#e2d7a7', '#9de59d', '#e8a7b5', '#ebccbf', '#b6f2d5',
  '#d1e295', '#e1a0e2', '#b9ebe5', '#d7e092', '#F2A9A0', '#9CCEEA', '#F6D976', '#A9D89A', '#CBB3E8', '#F4BE85', '#8FD4C0', '#EBA8C4'];

// A4 pionowo, marginesy 10 mm góra/dół i 8 mm boki (`@page` w Pomocniku): strona `.pg` ma 194 × 276 mm.
const MM = 72 / 25.4; // punkty PDF na milimetr
const A4 = [210 * MM, 297 * MM];
const MARGIN = { top: 10, left: 8 };
const PG = { w: 194, h: 276 };
const SKALA = 3; // ok. 290 dpi: ostry tekst, strona mieści się w limicie płótna na iPhonie

// Style z Pomocnika (sekcja „wydruk” w style.css + `drukDynCss` dla własnego layoutu) oraz to, co strona
// Pomocnika daje globalnie: box-sizing, line-height 1.45 i 14 px (od tego zależą wysokości wierszy).
const c = UKLAD;
const CSS = `
.ht-druk{position:fixed;left:-10000px;top:0;width:${PG.w}mm;background:#fff;font-size:14px;line-height:1.45;text-align:left}
.ht-druk *{box-sizing:border-box}
.print-doc{font-family:Arial,Helvetica,sans-serif;color:#000}
.print-doc .pg{box-sizing:border-box;width:100%;height:${PG.h}mm;display:flex;flex-direction:column;overflow:hidden;background:#fff}
.print-doc .pg-headline{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex:none}
.print-doc .doc-title{flex:1 1 auto;font-size:20px;font-weight:700;color:#000;text-align:center;padding:6px 12px;border-radius:4px;line-height:1.2}
.print-doc .pg-stamp{flex:none;font-size:8px;color:#666;white-space:nowrap}
.print-doc .doc-sign{font-size:11px;margin:0 0 8px;flex:none}
.print-doc .pg-table{flex:1 1 auto;min-height:0;overflow:hidden}
.print-doc .pg-foot{font-size:8px;color:#666;text-align:center;margin-top:6px;flex:none}
.print-doc table{width:100%;border-collapse:collapse;table-layout:fixed}
.print-doc th{font-size:11px;font-weight:700;border:1px solid #000;padding:3px 5px;text-align:center;vertical-align:middle;height:8mm}
.print-doc td{border:1px solid #000;padding:3px 5px;vertical-align:middle;text-align:center;height:8mm;word-wrap:break-word;overflow-wrap:break-word}
.print-doc td.t-rodzaj{font-size:11px;font-weight:400}
.print-doc td.t-ilosc{font-size:11px;font-weight:400}
.print-doc td.t-uwagi{font-size:9px;font-weight:400;color:#c00;white-space:pre-line}
.print-doc.pd-custom .doc-title{font-size:${c.fontTytul}px}
.print-doc.pd-custom th{font-size:${c.fontNaglowki}px;height:${c.wysNaglowka}mm;padding:${c.padPion}px ${c.padPoziom}px;border-width:${c.gruboscLinii}px}
.print-doc.pd-custom td{height:${c.wysWiersza}mm;padding:${c.padPion}px ${c.padPoziom}px;border-width:${c.gruboscLinii}px}
.print-doc.pd-custom td.t-rodzaj{font-size:${c.fontNazwa}px}
.print-doc.pd-custom td.t-ilosc{font-size:${c.fontIlosc}px}
.print-doc.pd-custom td.t-uwagi{font-size:${c.fontUwagi}px;color:${c.kolorUwag}}`;

/* --- daty jak w Pomocniku ------------------------------------------------------ */

const cz = (iso) => String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
export const dataPLfull = (iso) => { const m = cz(iso); return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || ''); };
const dataPL = (iso) => { const m = cz(iso); return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : (iso || ''); };
const dataPLshort = (iso) => { const m = cz(iso); return m ? `${m[3]}.${m[2]}` : (iso || ''); };

export function dateRangeShort({ data: a, dataDo: b }) {
  if (!a) return '';
  if (!b || b <= a) return dataPLshort(a);
  const ma = cz(a), mb = cz(b);
  if (!ma || !mb) return dataPLshort(a);
  if (ma[1] === mb[1] && ma[2] === mb[2]) return `${ma[3]}-${mb[3]}.${ma[2]}`;
  return `${ma[3]}.${ma[2]}-${mb[3]}.${mb[2]}`;
}

// Data w nazwie pliku (`dateFileStamp` w Pomocniku).
export function dateFileStamp({ data: a, dataDo: b }) {
  if (!a) return b ? dataPL(b) : '';
  if (!b || b <= a) return dataPL(a);
  const ma = cz(a), mb = cz(b);
  if (!ma || !mb) return dataPL(a);
  if (ma[1] === mb[1] && ma[2] === mb[2]) return `${ma[3]}-${mb[3]}.${ma[2]}.${ma[1].slice(2)}`;
  if (ma[1] === mb[1]) return `${ma[3]}.${ma[2]}-${mb[3]}.${mb[2]}.${ma[1].slice(2)}`;
  return `${dataPL(a)}-${dataPL(b)}`;
}

export const nazwaPliku = (l, dzis) =>
  `${`${l.nazwa || 'Lista sprzętu'} ${dateFileStamp(l) || dataPL(dzis)}`.replace(/[\\/:*?"<>|]+/g, '-').trim()}.pdf`;

/* --- HTML wydruku (buildPrintDoc) -------------------------------------------------- */

const widoczne = UKLAD.kolumny.filter((k) => k.widoczna !== false);
const colgroup = `<colgroup>${widoczne.map((k) => `<col style="width:${k.szer}%">`).join('')}</colgroup>`;
const thead = `<thead><tr>${widoczne.map((k) => `<th>${esc(k.nazwa)}</th>`).join('')}</tr></thead>`;

function komorka(k, p, span, flagi) {
  const cls = k.cls || ({ rodzaj: 't-rodzaj', ilosc: 't-ilosc', uwagi: 't-uwagi' }[k.typ] || 't-pusta');
  let tresc = '';
  if (p) {
    if (k.typ === 'rodzaj') tresc = esc(p.nazwa);
    else if (k.typ === 'ilosc') tresc = esc(p.ilosc || '');
    else if (k.typ === 'uwagi') tresc = esc(p.uwagi || '') + (p.flaga && flagi ? `${p.uwagi ? '\n' : ''}*Do potwierdzenia` : '');
  }
  return `<td class="${cls}"${span > 1 ? ` colspan="${span}"` : ''}>${tresc}</td>`;
}

function wiersz(p, flagi) {
  const cells = [];
  for (let i = 0; i < widoczne.length;) {
    const grp = UKLAD.scalenia.find((g) => g.includes(widoczne[i].id));
    let span = 1;
    if (grp) while (i + span < widoczne.length && grp.includes(widoczne[i + span].id)) span++;
    cells.push(komorka(widoczne[i], p, span, flagi));
    i += span;
  }
  return `<tr>${cells.join('')}</tr>`;
}

// Strony `.pg` jak w Pomocniku: wiersze mierzone w przeglądarce, na ostatniej stronie puste wiersze do końca.
function stronyHtml(l, host, dzis) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;width:100mm;height:100mm';
  host.appendChild(probe);
  const pxPerMm = probe.offsetWidth / 100 || 3.78;
  probe.remove();
  const pageH = PG.h * pxPerMm;
  const color = PALETA[(l.kolor || 0) % PALETA.length];
  const stamp = UKLAD.pokazStempel ? `Utworzono: ${dataPLfull(l.utworzono.slice(0, 10)) || dataPLfull(dzis)}` : '';
  const dt = dateRangeShort(l);
  const titleTxt = esc(l.nazwa || 'Lista sprzętu') + (dt ? ` - ${dt}` : '');
  const headline = `<div class="pg-headline"><div class="doc-title" style="background:${color}">${titleTxt}</div><div class="pg-stamp">${stamp}</div></div>`;
  const sign = UKLAD.pokazPodpis ? '<div class="doc-sign">Osoba odpowiedzialna za listę: ______________________________</div>' : '';
  const flagi = l.drukFlagi === true;
  const filler = wiersz(null, false);

  const meas = document.createElement('div');
  meas.className = 'print-doc pd-custom';
  meas.style.width = `${PG.w}mm`;
  host.appendChild(meas);
  const measH = (html) => { meas.innerHTML = html; return meas.firstChild.offsetHeight; };
  const hHeadline = measH(headline) + 8;
  const hSign = sign ? measH(sign) + 8 : 0;
  const hColhead = measH(`<table>${colgroup}${thead}</table>`);
  const hFoot = UKLAD.pokazStopke ? measH('<div class="pg-foot">Strona 1 z 1</div>') + 6 : 0;
  meas.innerHTML = `<table>${colgroup}<tbody>${l.pozycje.map((p) => wiersz(p, flagi)).join('')}</tbody></table>`;
  const rowH = [...meas.querySelectorAll('tbody tr')].map((tr) => tr.offsetHeight);
  meas.innerHTML = `<table>${colgroup}<tbody>${filler}</tbody></table>`;
  const hFiller = meas.querySelector('tr')?.offsetHeight || 8 * pxPerMm;
  meas.remove();

  const SAFE = 14;
  const cap1 = pageH - hHeadline - hFoot - hSign - hColhead - SAFE;
  const capN = pageH - hFoot - SAFE;
  const pages = [];
  let cur = [], curH = 0, cap = cap1, first = true;
  l.pozycje.forEach((_, i) => {
    const rh = rowH[i] || hFiller;
    if (cur.length && curH + rh > cap) {
      pages.push({ first, rows: cur });
      cur = []; curH = 0; first = false; cap = capN;
    }
    cur.push(i);
    curH += rh;
  });
  pages.push({ first, rows: cur });

  return pages.map((pg, idx) => {
    const myCap = pg.first ? cap1 : capN;
    const used = pg.rows.reduce((a, i) => a + (rowH[i] || hFiller), 0);
    const fillN = idx === pages.length - 1 && UKLAD.wypelniacze ? Math.max(0, Math.floor((myCap - used) / hFiller) - 1) : 0;
    const rows = pg.rows.map((i) => wiersz(l.pozycje[i], flagi)).join('') + filler.repeat(fillN);
    const table = `<table>${colgroup}${pg.first ? thead : ''}<tbody>${rows}</tbody></table>`;
    return `<div class="pg">${pg.first ? headline + sign : ''}<div class="pg-table">${table}</div>${UKLAD.pokazStopke ? `<div class="pg-foot">Strona ${idx + 1} z ${pages.length}</div>` : ''}</div>`;
  }).join('');
}

/* --- PDF ------------------------------------------------------------------------ */

// Lista (z model.js `lista`) → plik PDF gotowy do udostępnienia.
export async function pdfListy(l, dzis) {
  const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([import('html2canvas'), import('pdf-lib')]);
  const style = document.createElement('style');
  style.textContent = CSS;
  const host = document.createElement('div');
  host.className = 'ht-druk';
  host.setAttribute('aria-hidden', 'true');
  document.head.appendChild(style);
  document.body.appendChild(host);
  try {
    host.innerHTML = `<div class="print-doc pd-custom">${stronyHtml(l, host, dzis)}</div>`;
    const pdf = await PDFDocument.create();
    pdf.setTitle(`${l.nazwa}${dateRangeShort(l) ? ` - ${dateRangeShort(l)}` : ''}`);
    pdf.setCreator('HandyTools');
    for (const pg of host.querySelectorAll('.pg')) {
      const canvas = await html2canvas(pg, {
        scale: SKALA,
        backgroundColor: '#ffffff',
        logging: false,
        // Kopia strony do renderu: kontener na widoku (w dokumencie jest poza ekranem), a tabela bez
        // border-collapse. html2canvas rysuje ramki każdej komórki osobno, więc wspólna kreska między
        // komórkami wychodziła podwójnie gruba; tu każda komórka ma tylko dolną i prawą, tabela górną i lewą.
        onclone: (doc) => {
          doc.querySelector('.ht-druk').style.left = '0';
          const st = doc.createElement('style');
          st.textContent = `.ht-druk table { border-collapse: separate; border-spacing: 0; border-top: ${c.gruboscLinii}px solid #000; border-left: ${c.gruboscLinii}px solid #000 }
            .ht-druk td, .ht-druk th { border-top-width: 0 !important; border-left-width: 0 !important }`;
          doc.head.appendChild(st);
        },
      });
      const png = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const img = await pdf.embedPng(await png.arrayBuffer());
      canvas.width = canvas.height = 0; // zwolnij pamięć płótna od razu (iPhone)
      const page = pdf.addPage(A4);
      page.drawImage(img, { x: MARGIN.left * MM, y: A4[1] - (MARGIN.top + PG.h) * MM, width: PG.w * MM, height: PG.h * MM });
    }
    return new File([await pdf.save()], nazwaPliku(l, dzis), { type: 'application/pdf' });
  } finally {
    host.remove();
    style.remove();
  }
}
