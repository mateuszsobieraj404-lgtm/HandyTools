// Dane z bazy Pomocnika List Sprzętu → to, co pokazuje ekran (spec: .scratch/pomocnik-remote/spec.md).
// Czyste funkcje, bez przeglądarki: testowane w model.test.js. Logika jak w Pomocniku (js/core.js, js/druk.js, js/archiwum.js).

// Porównywanie bez polskich znaków i wielkości liter (jak `nrm` w Pomocniku).
export const nrm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

/* --- wiersze z bazy → obiekty ------------------------------------------------ */

export function lista(row) {
  const d = row.dane ?? {};
  return {
    id: row.id,
    nazwa: d.nazwa || 'Bez nazwy',
    data: d.data || '',
    dataDo: d.dataDo || '',
    rodzaj: d.rodzaj || '',
    opis: d.opis || '',
    kolejnosc: d.kolejnosc || 0,
    naszykowana: !!d.naszykowana,
    zaladowana: !!d.zaladowana,
    drukFlagi: !!d.drukFlagi, // „*Do potwierdzenia” przy pozycjach z flagą
    autor: row.utworzyl ?? null,
    pozycje: (Array.isArray(d.pozycje) ? d.pozycje : []).map((p) => ({
      sprzetId: p.sprzetId || null,
      nazwa: p.nazwa || '',
      magazynId: p.magazynId || null,
      ilosc: String(p.ilosc ?? '1'),
      uwagi: p.uwagi || '',
      flaga: !!p.flaga,
    })),
  };
}

export function sprzet(row) {
  const d = row.dane ?? {};
  const stan = d.stanMagazynowy;
  return {
    id: row.id,
    nazwa: d.nazwa || '',
    alias: d.alias || '',
    magazynId: d.magazynId || null,
    pozycja: d.pozycja ?? 9999,
    tagi: Array.isArray(d.tagi) ? d.tagi : [],
    stan: stan === null || stan === undefined || stan === '' ? null : Number(stan),
    uwaga: d.uwagaStala || '',
  };
}

export const magazyn = (row) => ({ id: row.id, nazwa: row.dane?.nazwa || 'Bez nazwy', kolejnosc: row.dane?.kolejnosc ?? 9999 });

/* --- daty ------------------------------------------------------------------- */

const MIES = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export function dzisISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dodajDni(iso, dni) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

// Ostatni dzień realizacji: `dataDo`, jeśli jest późniejsza niż `data`.
export const koniec = (l) => (l.dataDo > l.data ? l.dataDo : l.data);

// „12 paź”, „12–14 paź”, „30 wrz – 2 paź”; rok tylko, gdy inny niż bieżący.
export function zakresDat(a, b, rok = new Date().getFullYear()) {
  const cz = (iso) => iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ma = cz(a);
  if (!ma) return '';
  const mb = b && b > a ? cz(b) : null;
  const r = (m) => (Number(m[1]) === rok ? '' : ` ${m[1]}`);
  const dm = (m) => `${Number(m[3])} ${MIES[Number(m[2]) - 1]}`;
  if (!mb) return `${dm(ma)}${r(ma)}`;
  if (ma[1] === mb[1] && ma[2] === mb[2]) return `${Number(ma[3])}–${dm(mb)}${r(mb)}`;
  return `${dm(ma)}${ma[1] === mb[1] ? '' : r(ma)} – ${dm(mb)}${r(mb)}`;
}

/* --- listy ------------------------------------------------------------------ */

// Kolejność jak w Pomocniku: data, w obrębie dnia ręczna `kolejnosc` (0 = na koniec dnia), potem nazwa.
const wDniu = (a, b) => (a.kolejnosc || 9999) - (b.kolejnosc || 9999) || a.nazwa.localeCompare(b.nazwa, 'pl');

// Nadchodzące (także trwające) rosnąco, archiwum malejąco, bez daty na końcu.
// Bez grupy „zaległe”: znacznik „Na busie” jest od 21.09.2026, starsze listy go nie mają.
export function grupujListy(listy, dzis) {
  const z = listy.filter((l) => l.data);
  return {
    nadchodzace: z.filter((l) => koniec(l) >= dzis).sort((a, b) => a.data.localeCompare(b.data) || wDniu(a, b)),
    archiwum: z.filter((l) => koniec(l) < dzis).sort((a, b) => b.data.localeCompare(a.data) || wDniu(a, b)),
    bezDaty: listy.filter((l) => !l.data).sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl')),
  };
}

// Listy, które trwają choć jeden dzień w oknie [dziś, dziś + dni].
export const wOknie = (listy, dzis, dni) => listy
  .filter((l) => l.data && l.data <= dodajDni(dzis, dni) && koniec(l) >= dzis)
  .sort((a, b) => a.data.localeCompare(b.data) || wDniu(a, b));

/* --- ilości i podsumowanie -------------------------------------------------- */

// Ilość jako liczba („4”, „2,5”), albo null dla tekstu („2 + 1”, „komplet”).
export function liczba(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

// Suma sprzętu z list (jak `buildSummary` w Pomocniku): po sprzęcie, a bez powiązania po nazwie.
// Liczby się sumują, tekst dopisuje się „ + ”. `brak`: liczbowo potrzeba więcej, niż jest na stanie.
export function podsumowanie(listy, sprzety) {
  const byId = new Map(sprzety.map((s) => [s.id, s]));
  const byName = new Map(sprzety.map((s) => [nrm(s.nazwa), s]));
  const grupy = new Map();
  for (const l of listy) {
    for (const p of l.pozycje) {
      const key = p.sprzetId ? `s:${p.sprzetId}` : `n:${nrm(p.nazwa)}`;
      let g = grupy.get(key);
      if (!g) grupy.set(key, (g = { nazwa: p.nazwa, sprzetId: p.sprzetId, magazynId: p.magazynId, suma: 0, liczbowo: false, teksty: [], zrodla: [] }));
      g.magazynId ||= p.magazynId;
      const n = liczba(p.ilosc);
      if (n !== null) Object.assign(g, { suma: g.suma + n, liczbowo: true });
      else if (p.ilosc.trim()) g.teksty.push(p.ilosc.trim());
      g.zrodla.push({ lista: l.nazwa, ilosc: p.ilosc });
    }
  }
  return [...grupy.values()].map((g) => {
    const s = (g.sprzetId && byId.get(g.sprzetId)) || byName.get(nrm(g.nazwa)) || null;
    return {
      nazwa: g.nazwa,
      magazynId: g.magazynId || s?.magazynId || null,
      pozycja: s?.pozycja ?? 9999,
      ilosc: [...(g.liczbowo ? [fmt(g.suma)] : []), ...g.teksty].join(' + ') || '—',
      stan: s?.stan ?? null,
      brak: g.liczbowo && s?.stan != null && g.suma > s.stan,
      zrodla: g.zrodla,
    };
  });
}

/* --- grupy po magazynach ------------------------------------------------------ */

// Elementy z `magazynId` → [{ id, nazwa, elementy }] w kolejności magazynów; bez magazynu na końcu.
// Wewnątrz: po `pozycja` (kolejność z bazy), potem nazwa; `zachowaj` = kolejność jak przyszła (pozycje listy).
export function poMagazynach(elementy, magazyny, { zachowaj = false } = {}) {
  const order = [...magazyny].sort((a, b) => a.kolejnosc - b.kolejnosc);
  const grupy = new Map([...order.map((m) => [m.id, { id: m.id, nazwa: m.nazwa, elementy: [] }]), [null, { id: null, nazwa: 'Bez magazynu', elementy: [] }]]);
  for (const e of elementy) (grupy.get(e.magazynId) ?? grupy.get(null)).elementy.push(e);
  const out = [...grupy.values()].filter((g) => g.elementy.length);
  if (!zachowaj) out.forEach((g) => g.elementy.sort((a, b) => (a.pozycja ?? 9999) - (b.pozycja ?? 9999) || a.nazwa.localeCompare(b.nazwa, 'pl')));
  return out;
}
