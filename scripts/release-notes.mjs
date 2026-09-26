// Notatki do GitHub Release z src/changelog.js (jedno źródło: to samo, co ekran Aktualizacje).
//   node scripts/release-notes.mjs            → wersja z góry changeloga
//   node scripts/release-notes.mjs 0.4.1      → notatki tej wersji (markdown)
//   node scripts/release-notes.mjs 0.4.1 --title   → tytuł release'u
//   node scripts/release-notes.mjs --latest   → sam numer najnowszej wersji
import { changelog } from '../src/changelog.js';

const [arg, flag] = process.argv.slice(2);
if (arg === '--latest' || !arg) {
  console.log(changelog[0].version);
  process.exit(0);
}

const v = changelog.find((e) => e.version === arg);
if (!v) {
  console.error(`Brak wersji ${arg} w src/changelog.js`);
  process.exit(1);
}

if (flag === '--title') {
  console.log(`${v.version} · ${v.title}`);
  process.exit(0);
}

const groups = { Nowe: 'Nowe', Poprawka: 'Poprawki', Zmiana: 'Zmiany' };
const sections = Object.entries(groups)
  .map(([kind, heading]) => {
    const items = v.items.filter(([k]) => k === kind).map(([, text]) => `- ${text}`);
    return items.length ? `### ${heading}\n\n${items.join('\n')}` : '';
  })
  .filter(Boolean);

console.log(`${sections.join('\n\n')}

---

Aplikacja: https://mateuszsobieraj404-lgtm.github.io/HandyTools/ · Pełna historia: ekran **Aktualizacje** w aplikacji.`);
