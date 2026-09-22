## Projekt

Webowa aplikacja na telefon (PWA), Vite + czysty JS, bez frameworka. Hosting: GitHub Pages (`.github/workflows/deploy.yml`, każdy push na `main`).

- Uruchom: `npm run dev` (adres dla telefonu w tej samej sieci Wi-Fi pokazuje się jako „Network”).
- Produkt i zasady: `Dokumentacja_produktu.md`. Wygląd: `Design System/` (tokeny w `handytools-tokens.css` są jedynym źródłem wartości, importowane wprost przez `src/main.js`).
- Nowe narzędzie: wpis w `tools` w `src/content.js`, ikona w `src/icons.js`. Opcjonalne `render(el)` rysuje treść ekranu narzędzia.
- Nawigacja przez hash (`#/narzedzie/<id>`, `#/<strona>`), żeby GitHub Pages nie zwracał 404.
- Cała zawartość w `src/content.js` pochodzi z makiety i jest poglądowa.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
