# HandyTools

Aplikacja na telefon z zestawem drobnych narzędzi. Jedno wejście zamiast kilkunastu osobnych aplikacji i zakładek w przeglądarce. Instaluje się na ekranie głównym telefonu i działa jak zwykła aplikacja, w ciemnym motywie.

## Narzędzia

### Pobieraczek

Pobiera wideo, dźwięk i zdjęcia z linku. Obsługuje około 1800 serwisów, m.in. YouTube, Facebook, Instagram, TikTok, X, Reddit, Vimeo i SoundCloud.

- Wklejanie linku jednym dotknięciem, podgląd tytułu, miniatury i czasu trwania.
- Trzy rodzaje pliku: wideo, wideo bez dźwięku, sam dźwięk.
- Formaty wideo MP4 i MKV, audio MP3, M4A, FLAC i WAV, z wyborem jakości i bitrate.
- Wycinanie fragmentu suwakiem, z podglądem i znacznikiem pozycji.
- Posty z wieloma elementami (karuzele, pokazy slajdów): wybór filmów i zapis wielu zdjęć naraz.
- Własna nazwa pliku, szacowany rozmiar, historia ostatnich pobrań.
- Zapis prosto do galerii zdjęć na iPhonie.

Pobieranie wykonuje komputer w domu, a telefon tylko wysyła do niego link i odbiera gotowy plik. Linki i historia nie trafiają nigdzie poza telefon i ten komputer.

## Jak to jest zbudowane

- Aplikacja: Vite i czysty JavaScript, bez frameworka.
- Serwer Pobieraczka: Node.js z programami yt-dlp (filmy i dźwięk), gallery-dl (zdjęcia) i ffmpeg (łączenie i konwersja).
- Wygląd: własny system wizualny z tokenami w `Design System/`.

```bash
npm install
npm run dev      # aplikacja w trybie deweloperskim
npm test         # testy
npm run build    # wersja produkcyjna
npm run server   # serwer Pobieraczka
```

| Gdzie | Co |
|---|---|
| `src/main.js` | menu, pasek dolny, panele, nawigacja |
| `src/content.js` | rejestr narzędzi i ekranów |
| `src/tools/pobieranie.js` | Pobieraczek |
| `src/changelog.js` | historia zmian |
| `server/server.js` | serwer Pobieraczka |
| `Design System/` | tokeny, opis systemu wizualnego, makieta |
| `Dokumentacja_produktu.md` | zasady produktu i kontrakt nowego narzędzia |

## Wersje

Historia zmian jest w aplikacji (ekran Aktualizacje) i w [Releases](https://github.com/mateuszsobieraj404-lgtm/HandyTools/releases).
