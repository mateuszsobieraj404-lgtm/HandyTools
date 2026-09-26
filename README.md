# HandyTools

[![Wersja](https://img.shields.io/github/v/release/mateuszsobieraj404-lgtm/HandyTools?label=wersja)](https://github.com/mateuszsobieraj404-lgtm/HandyTools/releases/latest)

Aplikacja na telefon z zestawem drobnych narzędzi. Jedno wejście zamiast kilkunastu apek i zakładek.

**Otwórz na telefonie:** https://mateuszsobieraj404-lgtm.github.io/HandyTools/
W Safari albo Chrome: *Udostępnij → Do ekranu głównego*. Działa jak zwykła aplikacja, w ciemnym motywie.

## Narzędzia

### Pobieraczek

Wideo, dźwięk i zdjęcia z linku. Około 1800 serwisów: YouTube, Facebook, Instagram, TikTok, X, Reddit, Vimeo, SoundCloud i inne.

- **Wklej link** (przycisk albo przytrzymanie pola), podgląd tytułu, miniatury i czasu.
- **Wideo / Bez dźwięku / Audio.** Wideo: MP4 (zapis w Zdjęciach) lub MKV. Audio: MP3, M4A, FLAC, WAV, bitrate 128–320 kb/s.
- **Jakość** tylko z tych, które serwis faktycznie ma. Domyślna w ustawieniach; gdy jej nie ma, najbliższa niższa.
- **Fragment** suwakiem z dwoma uchwytami albo wpisany ręcznie. Podgląd z odtwarzaczem i pinezką do przewijania.
- **Posty z wieloma elementami** (karuzele, pokazy slajdów, wpisy z kilkoma filmami): siatka miniatur, zdjęcia zapisywane naraz.
- **Własna nazwa pliku**, szacowany rozmiar, historia 20 ostatnich pobrań.
- **Zapis na iPhonie** przez okno Udostępnij → Zdjęcia albo Pliki.

Pobieraczek potrzebuje [serwera na komputerze](#serwer-pobieraczka). Bez niego pozostałe części aplikacji działają normalnie.

## Serwer Pobieraczka

Pobieranie robi komputer w domu (domowe łącze: YouTube nie blokuje), a telefon łączy się z nim przez bezpieczny tunel. Kod: [`server/server.js`](server/server.js).

**Wymagania (Windows):** Node.js 24, Python z `yt-dlp` i `gallery-dl`, `ffmpeg`, [Tailscale](https://tailscale.com).

1. `pip install yt-dlp gallery-dl`
2. Plik `server/.env` z hasłem: `HT_PASSWORD=twoje-haslo` (plik jest poza repozytorium).
3. Uruchom **`start-serwer.bat`** (dwuklik). Okno musi zostać otwarte. Przy starcie serwer sam aktualizuje yt-dlp i gallery-dl.
4. Raz: `tailscale funnel --bg 8787`. Daje stały adres `https://<komputer>.<sieć>.ts.net`, działa też po restarcie.
5. W aplikacji: **Ustawienia → Pobieraczek**, wpisz adres i hasło.

**X, Instagram, Reddit:** część treści widać tylko po zalogowaniu. Zaloguj się w **Firefoksie** na komputerze (najlepiej na zapasowe konto); serwer bierze stamtąd ciasteczka tylko dla tych trzech serwisów. Chrome i Edge szyfrują ciasteczka tak, że nie da się ich odczytać.

**Prywatność:** linki, które wklejasz, idą tylko z telefonu na Twój komputer (tunel szyfrowany do samego komputera). Historia pobrań i ustawienia zostają w pamięci telefonu. Hasło (`server/.env`) jest poza repozytorium, a log błędów z linkami leży poza folderem projektu (`%LOCALAPPDATA%\HandyTools\server.log`). GitHub dostaje tylko kod aplikacji.

**Ograniczenia:** komputer musi być włączony; treści z DRM (Netflix, Spotify, Disney+) nie da się pobrać; iPhone zapisze z aplikacji plik do 200 MB. Pobieraj tylko to, do czego masz prawo: własne materiały albo treści na wolnych licencjach.

## Rozwój

Vite + czysty JavaScript, bez frameworka.

```bash
npm install
npm run dev      # aplikacja; adres „Network” otworzysz na telefonie w tej samej sieci Wi-Fi
npm test         # testy
npm run build    # wersja produkcyjna do dist/
npm run server   # serwer Pobieraczka (to samo co start-serwer.bat)
```

| Gdzie | Co |
|---|---|
| `src/main.js` | menu, pasek dolny, arkusze, nawigacja (`#/…`) |
| `src/content.js` | rejestr narzędzi i ekranów |
| `src/tools/pobieranie.js` | Pobieraczek (aplikacja) |
| `src/changelog.js` | historia zmian: ekran Aktualizacje i notatki do Releases |
| `server/server.js` | serwer Pobieraczka |
| `Design System/` | tokeny (`handytools-tokens.css`, jedyne źródło wartości), opis systemu wizualnego, makieta |
| `Dokumentacja_produktu.md` | zasady produktu i kontrakt nowego narzędzia |

**Nowe narzędzie:** wpis w `tools` w `src/content.js` i ikona w `src/icons.js`; ekran rysuje funkcja `render(el)`.

## Wydania

Każda zmiana dostaje wpis na górze [`src/changelog.js`](src/changelog.js) z nową wersją. Po wypchnięciu na `main`:

- aplikacja publikuje się na GitHub Pages (`.github/workflows/deploy.yml`),
- powstaje [GitHub Release](https://github.com/mateuszsobieraj404-lgtm/HandyTools/releases) z notatkami z changeloga (`.github/workflows/release.yml`),
- w aplikacji na pasku przy **Aktualizacje** pojawia się kropka.
