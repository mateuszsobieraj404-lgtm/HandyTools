// Jedyne miejsce, które rozmawia z bazą Pomocnika List Sprzętu (Supabase). Tylko odczyt: pilnuje tego tylko-odczyt.test.js.
// Adres bazy, klucz, sesja i ostatnio pobrane dane są tylko w telefonie (localStorage), nigdy w repo.
import { lista, sprzet, magazyn } from './model.js';

const KEY = {
  polaczenie: 'ht.pomocnik.polaczenie', // { url, key, ok }
  auth: 'ht.pomocnik.auth', // sesja supabase-js
  profil: 'ht.pomocnik.profil', // { nazwa, rola }
  dane: 'ht.pomocnik.dane', // ostatni stan bazy, do pokazania od razu i bez internetu
};

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch { /* pełna albo zablokowana pamięć: działa bez zapisu */ }
};

export const polaczenie = () => read(KEY.polaczenie);
export const profil = () => read(KEY.profil);
export const zapisane = () => read(KEY.dane);
// Synchronicznie, bez ładowania biblioteki: menu pokazuje kafel tylko po zalogowaniu.
export const zalogowany = () => !!(polaczenie() && read(KEY.auth));

export const ROLA = { wlasciciel: 'Właściciel', edytor: 'Edytor', podglad: 'Podgląd' };

let client = null;
let clientUrl = null;
async function klient() {
  const p = polaczenie();
  if (!p) throw new Error('Najpierw połącz z Pomocnikiem w Koncie.');
  if (!client || clientUrl !== p.url) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(p.url, p.key, { auth: { storageKey: KEY.auth, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    clientUrl = p.url;
  }
  return client;
}

// Błędy Supabase po polsku; reszta bez zmian.
function blad(e) {
  const m = String(e?.message ?? e ?? '');
  if (!navigator.onLine || /fetch|network|load failed/i.test(m)) return new Error('Brak połączenia z bazą. Sprawdź internet.');
  if (/invalid login credentials/i.test(m)) return new Error('Zły e-mail albo hasło.');
  if (/invalid api key|no api key/i.test(m)) return new Error('Zły klucz publiczny. Sprawdź połączenie w Koncie.');
  if (/jwt|refresh token/i.test(m)) return new Error('Sesja wygasła. Zaloguj się ponownie w Koncie.');
  return new Error(m || 'Coś poszło nie tak.');
}

export function polacz(url, key) {
  url = url.trim().replace(/\/+$/, '');
  key = key.trim();
  if (!/^https:\/\/\S+$/.test(url)) throw new Error('Adres bazy zaczyna się od https://');
  if (!key) throw new Error('Wklej klucz publiczny (anon albo publishable).');
  write(KEY.polaczenie, { url, key });
}

export async function zaloguj(email, haslo) {
  const c = await klient();
  const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password: haslo });
  if (error) throw blad(error);
  const { data: p, error: e2 } = await c.from('profiles').select('nazwa, rola, zablokowany').eq('id', data.user.id).maybeSingle();
  if (e2 || !p || p.zablokowany) {
    await wyloguj();
    throw e2 ? blad(e2) : new Error('To konto nie ma dostępu do Pomocnika.');
  }
  write(KEY.profil, { nazwa: p.nazwa, rola: p.rola });
  write(KEY.polaczenie, { ...polaczenie(), ok: true }); // adres i klucz potwierdzone logowaniem
}

// Tylko ta sesja (scope local): „global” wylogowałby też Pomocnika na komputerze.
export async function wyloguj() {
  try {
    await (await klient()).auth.signOut({ scope: 'local' });
  } catch { /* bez internetu: wystarczy zapomnieć sesję w telefonie */ }
  [KEY.auth, KEY.profil, KEY.dane].forEach((k) => write(k, null));
}

// Cała baza jednym razem (ok. 115 list, 270 pozycji sprzętu, ok. 250 kB).
// ponytail: bez stronicowania; Supabase oddaje do 1000 wierszy na zapytanie, dopisać .range(), gdy list będzie więcej.
export async function pobierz() {
  const c = await klient();
  const { data: { session } } = await c.auth.getSession();
  if (!session) {
    await wyloguj();
    throw new Error('Sesja wygasła. Zaloguj się ponownie w Koncie.');
  }
  const q = (t, cols) => c.from(t).select(cols).eq('usuniety', false);
  const res = await Promise.all([
    q('listy', 'id, dane, utworzyl'),
    q('sprzet', 'id, dane'),
    q('magazyny', 'id, dane'),
    c.from('konfiguracja').select('klucz, wartosc').in('klucz', ['rodzaje', 'tagi']),
    c.from('profiles').select('id, nazwa'),
  ]).catch((e) => [{ error: e }]);
  const err = res.find((r) => r.error)?.error;
  if (err) throw blad(err);
  const [l, s, m, k, p] = res.map((r) => r.data);
  const conf = (klucz) => k.find((x) => x.klucz === klucz)?.wartosc ?? [];
  const dane = {
    czas: Date.now(),
    listy: l.map(lista),
    sprzet: s.map(sprzet),
    magazyny: m.map(magazyn),
    rodzaje: conf('rodzaje'),
    tagi: conf('tagi'),
    autorzy: Object.fromEntries(p.map((x) => [x.id, x.nazwa])),
  };
  write(KEY.dane, dane);
  return dane;
}
