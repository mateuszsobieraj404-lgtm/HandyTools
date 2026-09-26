# Konwerter: pliki z jednego formatu na inny

Status: resolved (0.8.0 zbudowany)

## Cel

Obok Pobieraczka: konwersja plików z telefonu, duży wybór rodzajów (obrazy, audio, wideo, PDF, dokumenty tekstowe). Wiele plików naraz.

## Decyzje

- **Wszystko w przeglądarce, bez serwera i bez instalacji** (decyzja autora, 26.09.2026). Silniki w WebAssembly, pobierane przy pierwszej konwersji danego rodzaju i trzymane w pamięci przeglądarki. Pliki nie opuszczają telefonu; działa bez włączonego komputera. Bez internetu tylko wtedy, gdy przeglądarka ma już aplikację i silnik w pamięci (brak service workera: bez gwarancji).
  - Inspiracja: convert.to.it (github.com/p2r3/convert, GPL-2.0). Ich kodu nie kopiujemy; używamy tych samych otwartych bibliotek.
- **Silniki (ładowane leniwie, po rodzaju):**
  - obrazy: `@imagemagick/magick-wasm` (Apache-2.0),
  - audio i wideo: `@ffmpeg/ffmpeg` + `@ffmpeg/core` jednowątkowy (GPL; GitHub Pages nie ustawia nagłówków COOP/COEP potrzebnych do wersji wielowątkowej),
  - PDF → obrazy: `pdfjs-dist` (Apache-2.0); obrazy → PDF: `pdf-lib` (MIT),
  - dokumenty tekstowe: `pandoc-wasm` (oficjalny pandoc 3.9, GPL); PDF z dokumentów: pandoc → Typst → `@myriaddreamin/typst.ts` (Apache-2.0).
- **Wiele plików naraz, także różnych rodzajów** (0.9.0): każdy plik ma własny format i opcje w rozwijanym panelu wiersza. Przy plikach jednego rodzaju przełącznik „Wspólne” / „Dla każdego pliku”. Pola zaznaczenia: konwersja i zapis („Zapisz” jednym oknem Udostępnij) dotyczą zaznaczonych; każdy gotowy plik ma też własny zapis. Zdjęcia → PDF ze wspólnymi ustawieniami łączą się w jeden plik.
- **Opcje: format + kluczowe:** obrazy (jakość, maks. rozmiar), audio (bitrate), wideo (rozdzielczość), GIF (szerokość), PDF → obrazy (rozdzielczość).
- **Współpraca z Pobieraczkiem:** plik pobrany w Pobieraczku można przekazać do Konwertera przed zapisem albo po nim, bez wybierania z telefonu (zasada produktu 2: narzędzia mogą współpracować).
- **Nazwa:** Konwerter (zastępuje poglądowy kafel „Konwerter” z makiety, ta sama ikona).

## Zakres

| Rodzaj | Z | Na |
|---|---|---|
| Obrazy | JPG, PNG, WEBP, HEIC, GIF, BMP, TIFF, AVIF | JPG, PNG, WEBP, GIF, BMP, TIFF, AVIF, PDF (wszystkie w jeden) |
| Audio | MP3, M4A, AAC, WAV, FLAC, OGG, OPUS, WMA | MP3, M4A, WAV, FLAC, OGG, OPUS |
| Wideo | MP4, MOV, MKV, WEBM, AVI | MP4, MOV, MKV, WEBM, GIF, MP3, M4A |
| PDF | PDF | JPG, PNG (strona po stronie), DOCX (tekst i podstawowy układ) |
| Tekst | MD, HTML, TXT, EPUB, DOCX, ODT, RTF | każdy z nich + PDF |

## Ograniczenia (znane i uczciwie komunikowane)

- Pierwsze użycie rodzaju pobiera silnik (obrazy ok. 15 MB, audio/wideo ok. 30 MB, dokumenty ok. 60 MB).
- Wideo wolniejsze niż na komputerze; pamięć karty na iPhonie ogranicza rozmiar pliku (ostrzeżenie powyżej ok. 300 MB).
- Word → PDF i PDF → Word: tekst, nagłówki, listy, obrazy; bez wiernego układu strony.
- **Poza zakresem na teraz:** Excel/PowerPoint → PDF (wymaga LibreOffice na serwerze; później na Raspberry Pi).

## Stany

- Pusty: przycisk „Wybierz pliki” + podpowiedź, co da się konwertować.
- Ładowanie silnika: postęp w MB, informacja „tylko za pierwszym razem”.
- Konwersja: postęp per plik.
- Błąd: przy pliku, którego dotyczy („Nie da się odczytać tego pliku jako …”).
- Offline: działa, jeśli silnik był już pobrany; inaczej komunikat.
