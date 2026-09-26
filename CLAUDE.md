## Projekt

Webowa aplikacja na telefon (PWA), Vite + czysty JS, bez frameworka. Hosting: GitHub Pages (`.github/workflows/deploy.yml`, każdy push na `main`).

- Serwer pobierania (narzędzie „Pobieranie”): `start-serwer.bat` (dwuklik) albo `npm run server` na komputerze, hasło w `server/.env` (`HT_PASSWORD=`, poza repo). Telefon łączy się przez Tailscale Funnel. Wymaga Pythona z yt-dlp (filmy), gallery-dl (zdjęcia) i ffmpeg. Log błędów: `%LOCALAPPDATA%\HandyTools\server.log` (poza repo, bo zawiera linki). Nigdy nie commituj danych użytkownika (linki, IP, adresy Tailscale, e-mail). Linki z X, Instagrama i Reddita używają ciasteczek z Firefoksa (`HT_COOKIES_BROWSER`), inne serwisy bez logowania.
- Testy: `npm test`.
- Uruchom: `npm run dev` (adres dla telefonu w tej samej sieci Wi-Fi pokazuje się jako „Network”).
- Produkt i zasady: `Dokumentacja_produktu.md`. Wygląd: `Design System/` (tokeny w `handytools-tokens.css` są jedynym źródłem wartości, importowane wprost przez `src/main.js`).
- Nowe narzędzie: wpis w `tools` w `src/content.js`, ikona w `src/icons.js`. Opcjonalne `render(el)` rysuje treść ekranu narzędzia.
- Nawigacja przez hash (`#/narzedzie/<id>`, `#/<strona>`), żeby GitHub Pages nie zwracał 404.
- Cała zawartość w `src/content.js` pochodzi z makiety i jest poglądowa (poza narzędziem Pobieranie i ekranem Aktualizacje).
- **Changelog jest obowiązkowy:** każda zmiana widoczna dla użytkownika (nowość, poprawka, zmiana działania, także serwera) = nowy wpis NA GÓRZE `src/changelog.js` z podbitą wersją, w tym samym commicie. Ekran: pasek → Aktualizacje. Po pushu GitHub Release tworzy się sam (`.github/workflows/release.yml`, notatki z `scripts/release-notes.mjs`); sprawdź, że workflow przeszedł.
- **README jest obowiązkowy:** nowe narzędzie, nowa funkcja albo zmiana w uruchamianiu serwera = aktualizacja `README.md` w tym samym commicie.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
