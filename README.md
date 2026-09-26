# HandyTools

Aplikacja na telefon z zestawem drobnych narzędzi. Jedno wejście zamiast kilkunastu osobnych aplikacji i zakładek w przeglądarce. Instaluje się na ekranie głównym telefonu i działa jak zwykła aplikacja, w ciemnym motywie.

## Narzędzia

### Pobieraczek

Pobiera wideo, dźwięk i zdjęcia z linku. Obsługuje około 1800 serwisów, m.in. YouTube, Facebook, Instagram, TikTok, X, Reddit, Vimeo i SoundCloud.

- Wklejanie linku jednym dotknięciem, podgląd tytułu, miniatury i czasu trwania.
- Trzy rodzaje pliku: wideo, wideo bez dźwięku, sam dźwięk.
- Formaty wideo MP4 i MKV, audio MP3, M4A, FLAC i WAV, z wyborem jakości i bitrate. Przy każdej opcji widać rozmiar pliku.
- Wycinanie fragmentu suwakiem, z podglądem i znacznikiem pozycji.
- Posty z wieloma elementami (karuzele, pokazy slajdów): wybór filmów i zapis wielu zdjęć naraz.
- Własna nazwa pliku, szacowany rozmiar, historia ostatnich pobrań.
- Zapis prosto do galerii zdjęć na iPhonie.

Pobieranie wykonuje komputer w domu, a telefon tylko wysyła do niego link i odbiera gotowy plik. Linki i historia nie trafiają nigdzie poza telefon i ten komputer.

### Konwerter

Zamienia pliki z jednego formatu na inny, w całości w telefonie: pliki nie są nigdzie wysyłane.

- Obrazy (w tym HEIC z iPhone'a), audio, wideo, PDF i dokumenty tekstowe; wiele plików naraz, także różnych rodzajów.
- Każdy plik może mieć własny format i opcje; pliki jednego rodzaju można też ustawić wspólnie.
- Zaznaczone pliki konwertuje się i zapisuje zbiorczo, każdy gotowy plik można też zapisać osobno.
- Kilka zdjęć w jeden PDF, PDF na obrazy strona po stronie, PDF na Word, dokumenty do PDF.
- Opcje jakości, rozmiaru, bitrate i rozdzielczości.
- Plik pobrany w Pobieraczku można przekazać do Konwertera jednym dotknięciem.

Konwersje działają w przeglądarce dzięki WebAssembly: [ImageMagick](https://github.com/dlemstra/magick-wasm), [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), [pdf.js](https://github.com/mozilla/pdf.js), [pdf-lib](https://github.com/Hopding/pdf-lib), [pandoc](https://github.com/jgm/pandoc) i [Typst](https://github.com/Myriad-Dreamin/typst.ts). ffmpeg i pandoc są na licencji GPL. Pomysł zainspirowany przez [convert.to.it](https://github.com/p2r3/convert).

### Pomocnik Remote

Podgląd bazy aplikacji Pomocnik List Sprzętu na telefonie, tylko do odczytu. Narzędzie pojawia się w menu po zalogowaniu kontem z Pomocnika (ekran Konto).

- Listy: nadchodzące i archiwum, wyszukiwanie, filtr rodzaju; w liście termin, autor, stan, opis i sprzęt z ilościami i uwagami, także po magazynach.
- Sprzęt: pogrupowany po magazynach, z wyszukiwarką, tagami i stanem magazynowym.
- Najbliższe dni: suma sprzętu z list na 7, 14 albo 30 dni, z ostrzeżeniem, gdy potrzeba więcej, niż jest na stanie.
- Ostatnio pobrany stan zostaje w telefonie i pokazuje się od razu, także bez internetu.

## Jak to jest zbudowane

- Aplikacja: Vite i czysty JavaScript, bez frameworka.
- Pomocnik Remote: [supabase-js](https://github.com/supabase/supabase-js), tylko odczyt.
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
| `src/tools/konwerter.js`, `src/tools/konwerter/` | Konwerter: ekran, katalog formatów, silniki |
| `src/tools/pomocnik.js`, `src/tools/pomocnik/`, `src/konto.js` | Pomocnik Remote: ekran, dane, logowanie |
| `src/changelog.js` | historia zmian |
| `server/server.js` | serwer Pobieraczka |
| `Design System/` | tokeny, opis systemu wizualnego, makieta |
| `Dokumentacja_produktu.md` | zasady produktu i kontrakt nowego narzędzia |

## Wersje

Historia zmian jest w aplikacji (ekran Aktualizacje) i w [Releases](https://github.com/mateuszsobieraj404-lgtm/HandyTools/releases).
