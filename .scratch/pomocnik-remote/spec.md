# Pomocnik Remote: podgląd Pomocnika List Sprzętu (tylko odczyt)

Status: resolved (0.10.0 zbudowany)

## Kontekst

Pomocnik List Sprzętu to aplikacja na komputer (Tauri, .exe). Dane trzyma w Supabase.
Cel: z telefonu, przez HandyTools, **tylko czytać** te dane:
- archiwum list sprzętu ze szczegółami,
- bazę sprzętu z ilościami,
- podsumowanie sprzętu na najbliższe dni.

Edycji na razie nie ma. Narzędzie pojawia się w menu **dopiero po zalogowaniu** (ekran Konto). Logowanie kontem właściciela z Pomocnika. Adres bazy i klucz są wpisywane w aplikacji, nie w publicznym repo.

## Co już wiadomo (sprawdzone)

**Pomocnik:**
- Czysty JS, supabase-js 2.x bezpośrednio z frontendu, bez Realtime. Logowanie e-mailem i hasłem. Role: `wlasciciel` / `edytor` / `podglad`.
- W HandyTools można użyć tej samej biblioteki i tego samego logowania.

**Zabezpieczenia na serwerze** (odczyt `pg_policies` na bazie produkcyjnej, 26.09.2026):
- `anon` nie widzi nic poza tabelą `meta`. Bez zalogowania żadnych danych.
- `listy`, `sprzet`, `magazyny`, `konfiguracja`: SELECT dla każdej roli, zmiany tylko właściciel/edytor.
- Konto właściciela może więc zapisywać. Tylko odczyt pilnuje kod HandyTools, więc dodaję test-strażnika (niżej).

**Dane:**
- Wspólny kształt tabel:
  - wiersz `{ id, dane jsonb, utworzyl, zmieniono, usuniety }`,
  - zawsze filtr `usuniety = false`.
- `listy.dane`: `{ nazwa, data, dataDo, rodzaj, opis, naszykowana, zaladowana, kolejnosc, pozycje[] }`
  - pozycja: `{ sprzetId, nazwa, magazynId, ilosc (TEKST: "4", "2 + 1"), uwagi, flaga }`.
- `sprzet.dane`: `{ nazwa, magazynId, pozycja, tagi[], stanMagazynowy (liczba albo null), alias, uwagaStala }`.
- `magazyny.dane`: `{ nazwa, kolejnosc }`.
- `konfiguracja`: klucze `rodzaje`, `tagi`.
- `profiles.nazwa`: autor listy.
- Skala:
  - ok. 270 pozycji sprzętu, z czego 25 ma podany stan,
  - 14 magazynów,
  - ok. 50 list, największa ma 74 pozycje.
  - Całość pobieramy jednym razem, bez stronicowania.
- Logika do przeniesienia (tylko czytanie kodu, bez kopiowania całych plików), w repo `C:\pomocnik-list-sprzetu`:
  - `normalizeLista`: `js/core.js:898`,
  - sumowanie `buildSummary`: `js/druk.js:5-35`,
  - „podsumowanie w przód”: `js/archiwum.js:305-318`,
  - sortowanie archiwum: `js/archiwum.js:117-119`,
  - kolumny wydruku: `js/core.js:821-834`.

**HandyTools:**
- W `src/content.js` jest już poglądowy kafel `listy` („Listy sprzętu”). Zastępuje go nowe narzędzie.
- Strona `konto` istnieje, ale bez treści (`src/content.js:38`). Awatar „MS” w nagłówku już do niej prowadzi (`src/main.js:72`).
- Router dzieli hash po `/`: trzeci człon (`#/narzedzie/pomocnik/<id-listy>`) jest dostępny bez przebudowy (`src/main.js:160`).

## Jak to ma działać (dla użytkownika)

**1. Konto (raz na telefonie).** Awatar w nagłówku → Konto.
- **„Połącz z Pomocnikiem”:** pola „Adres bazy” i „Klucz publiczny”, zapisywane tylko w telefonie.
- Pod spodem e-mail i hasło → **Zaloguj**.
- Po zalogowaniu Konto pokazuje nazwę z `profiles`, rolę i przycisk **Wyloguj**.
- Sesja trzyma się po zamknięciu aplikacji; supabase-js sam odświeża token.

**2. Menu.** Po zalogowaniu pojawia się kafel „Pomocnik Remote” (pełna nazwa w nagłówku ekranu). Po wylogowaniu kafel znika.
- Ukrycie kafla to wygoda, nie zabezpieczenie. Dane chroni logowanie w Supabase.

**3. Ekran narzędzia.** Przełącznik na górze: **Listy | Sprzęt | Najbliższe dni**. Pod nagłówkiem: „Stan z 14:32 · Odśwież”.

- **Listy:**
  - wyszukiwarka i przełącznik rodzaju („Wszystkie” + rodzaje z `konfiguracja.rodzaje`),
  - grupy (bez „Zaległych”: 101 ze 115 starych list nie ma znacznika „Na busie”, bo istnieje od 21.09.2026; trwające listy liczą się jako nadchodzące):
    - **Nadchodzące:** od dziś, rosnąco po dacie, potem `kolejnosc`,
    - **Archiwum:** malejąco.
  - Wiersz listy:
    - nazwa,
    - daty („12–14 paź”),
    - rodzaj,
    - liczba pozycji,
    - znaczniki „Naszykowana” i „Na busie”.
- **Szczegóły listy** (`#/narzedzie/pomocnik/<id>`, Wstecz wraca do list):
  - daty, rodzaj, autor, statusy, opis,
  - pozycje: nazwa, ilość, uwagi (uwagi i „do potwierdzenia” wyróżnione jak na wydruku),
  - przełącznik „Kolejność z listy | Po magazynach”,
  - licznik pozycji na magazyn.
- **Sprzęt:**
  - wyszukiwarka (nazwa i alias), filtr tagów,
  - grupy po magazynach (kolejność z `magazyny.kolejnosc`, w środku `pozycja`),
  - wiersz: nazwa, alias, **stan** (liczba albo „—”), stała uwaga.
- **Najbliższe dni:**
  - przełącznik 7 / 14 / 30 dni,
  - listy trwające choć jeden dzień w tym oknie (bez zaległych, powód jak wyżej),
  - suma sprzętu po `sprzetId` (albo po nazwie), pogrupowana po magazynach.
  - Ilości liczbowe są sumowane. Tekstowe łączone „ + ”, jak w Pomocniku.
  - Przy pozycji ze stanem magazynowym pokazujemy „potrzeba X z Y”. Gdy potrzeba więcej, niż jest na stanie, wyróżnienie jak `qtyWarn` z `js/core.js:918`.

**4. Bez internetu.** Ostatnio pobrane dane są w telefonie i pokazują się od razu przy wejściu. Odświeżenie idzie w tle.
- Offline: komunikat „Bez połączenia, stan z …”.
- Zasada produktu 3: stan przetrwa zamknięcie.

## Budowa (pliki)

**Nowe:**
- `src/tools/pomocnik.js`: ekran narzędzia `render(el)`. Trzy widoki i szczegóły listy, wzorem `src/tools/konwerter.js`: `draw()`, delegacja `el.onclick`, `esc()` z `src/html.js`, ikony z `src/icons.js`.
- `src/tools/pomocnik/dane.js`: jedyne miejsce z Supabase.
  - `polacz({url, key})`, `zaloguj(email, haslo)`, `wyloguj()`, `zalogowany()`, `pobierz()`.
  - `pobierz()`: 5 zapytań naraz, każde `.select(...).eq('usuniety', false)`, dla `listy`, `sprzet`, `magazyny`, `konfiguracja` (`klucz in ('rodzaje','tagi')`) i `profiles (id, nazwa)`.
  - Klient `createClient(url, key, { auth: { storageKey: 'ht.pomocnik.auth', persistSession: true } })`.
  - `zalogowany()` synchronicznie sprawdza `localStorage['ht.pomocnik.auth']`; potrzebne do ukrywania kafla przed załadowaniem biblioteki.
  - Import `@supabase/supabase-js` przez dynamiczny `import()`, żeby nie zwiększać wagi menu (jak silniki w `src/tools/konwerter/engines.js`).
- `src/tools/pomocnik/model.js`: czyste funkcje bez przeglądarki.
  - `normalizujListe`, `sortujListy`, `grupujListy(dzis)`: zaległe, nadchodzące, archiwum,
  - `zakresDat`: format dat po polsku,
  - `sumaIlosci`: parsowanie „2 + 1”, tekst zostaje tekstem,
  - `podsumowanie(listy, dni, dzis)`,
  - `sprzetPoMagazynach`.
- `src/tools/pomocnik/model.test.js`: testy powyższych, `node:test` jak `formats.test.js`.
- `src/tools/pomocnik/tylko-odczyt.test.js`: strażnik tylko-odczytu. Czyta źródła `src/tools/pomocnik*` i nie przepuszcza `.insert(`, `.update(`, `.upsert(`, `.delete(`, `.rpc(`, `storage`. Przy koncie właściciela to jedyna bariera przed przypadkowym zapisem.
- `src/konto.js`: `render(el)` ekranu Konto: połączenie, logowanie, wylogowanie.

**Zmiany:**
- `src/content.js`:
  - wpis `{ id: 'pomocnik', name: 'Pomocnik Remote', icon: 'listy', hidden: () => !zalogowany(), ...pomocnik }` zamiast poglądowego `listy`,
  - strona `konto` dostaje treść.
- `src/main.js`:
  - pomijać narzędzia z `hidden?.()` w siatce, wyszukiwarce i kartach stanu (`:38`, `:121`),
  - strony z `render(el)` montowane jak narzędzia,
  - przy trzecim członie hasha Wstecz prowadzi do `#/narzedzie/<id>`, nie do menu.
- `Design System/handytools-tokens.css`: tylko jeśli zabraknie komponentu (np. znacznik statusu). Najpierw istniejące: `ht-segmented`, `ht-group`, `ht-rows`, `ht-card`, `ht-field`.
- `package.json`: zależność `@supabase/supabase-js`.
- Obowiązkowe przy każdej zmianie:
  - `src/changelog.js`: 0.10.0 „Pomocnik Remote”,
  - `README.md`: zwykły opis, bez adresu bazy i kluczy,
  - `PRODUCT.md`: nowe narzędzie, zależne od konta,
  - spec w `.scratch/pomocnik-remote/spec.md`.

**Prywatność:**
- Adres bazy, klucz, e-mail, sesja i dane są tylko w `localStorage` telefonu. Nic z tego nie trafia do repo, README ani release notes.
- W Pomocniku nic się nie zmienia.

## Etapy

1. **Konto + połączenie + ukryty kafel:** logowanie działa, kafel pojawia się i znika.
2. **Listy + szczegóły**, pamięć ostatniego stanu.
3. **Sprzęt z ilościami.**
4. **Najbliższe dni.**

Każdy etap to osobny commit z wpisem w changelogu.

**Później (poza tym planem):**
- „Gdzie jest sprzęt”: na których nadchodzących listach i ile.
- Udostępnienie listy jako tekst albo PDF (współpraca z Konwerterem/drukiem).
- Odhaczanie „naszykowano” na telefonie. To już edycja: wymaga ostrożności z synchronizacją Pomocnika (odpytywanie co 60 s, `zmieniono`), więc osobna decyzja.

## Sprawdzenie

- `npm test`: model (sortowanie, grupy dat, sumy „2 + 1”, podsumowanie 7/14/30) i strażnik tylko-odczytu.
- Podgląd `npm run dev`, widok 375×812:
  - wpisanie adresu i klucza, logowanie kontem właściciela (hasło wpisujesz **Ty**, nie ja),
  - kafel się pojawia,
  - Listy, szczegóły, Sprzęt, Najbliższe dni pokazują dane zgodne z Pomocnikiem na PC. Porównanie 2–3 list i podsumowania 7 dni z Pomocnikiem.
- W zakładce Sieć tylko zapytania GET do REST oraz auth. Żadnego POST/PATCH/DELETE poza logowaniem i odświeżeniem tokenu.
- Tryb offline w DevTools: dane z pamięci plus komunikat.
- Wylogowanie: kafel znika, `ht.pomocnik.*` wyczyszczone.
- Po pushu: deploy.yml i release.yml na zielono. Na iPhonie logowanie raz i ponowne otwarcie aplikacji z zachowaną sesją.
