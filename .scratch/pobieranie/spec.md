# Pobieranie: wideo i audio z linku

Status: resolved (0.4.0 „Pobieraczek” zbudowany)

## Cel

Wklejam link z dowolnego serwisu, wybieram wideo albo audio, jakość i opcjonalnie fragment, plik ląduje na telefonie. Jak najwięcej obsługiwanych stron.

## Decyzje

- **Silnik:** yt-dlp (ok. 1800 serwisów) + ffmpeg (łączenie obrazu z dźwiękiem, MP3, przycinanie).
- **Serwer:** komputer Mateusza (Windows), domowy adres IP (YouTube nie blokuje). Działa tylko, gdy komputer jest włączony.
- **Serwer w Node** (`server/`, `node:http`, bez frameworka), uruchamia `yt-dlp` jako proces. Node jest już w projekcie; Python niepotrzebny poza samym yt-dlp.
- **Dostęp z telefonu:** Tailscale Funnel: stały, darmowy adres HTTPS do komputera (aplikacja na GitHub Pages jest HTTPS, więc serwer też musi być HTTPS). Cloudflare odrzucony: bez własnej domeny adres zmienia się przy każdym uruchomieniu.
- **Zabezpieczenie:** hasło. Telefon wysyła je w nagłówku; bez hasła serwer odmawia. Kod aplikacji jest publiczny, adres serwera i hasło nie trafiają do repo.
- **Nie obsługujemy:** treści z DRM (Netflix, Spotify, Disney+, HBO Max), treści wymagające logowania (na razie).

## Zakres pierwszej wersji

1. Pole na link + „Sprawdź” → karta z miniaturą, tytułem, czasem trwania, nazwą serwisu.
2. Przełącznik **Wideo / Audio**.
   - Wideo: wybór jakości z tego, co serwis faktycznie ma (np. 1080p, 720p, 480p), MP4.
   - Audio: MP3 albo M4A, najlepsza dostępna jakość.
3. **Przycinanie:** opcjonalne pola „od” i „do” (mm:ss albo h:mm:ss). Puste = całość.
4. „Pobierz” → postęp w procentach → plik zapisuje się na telefonie.
5. **Historia pobrań** na telefonie (localStorage): miniatura, tytuł, typ, jakość, fragment, data. Dotknięcie wpisu wkleja link ponownie. Karta stanu w menu: liczba pobrań / ostatnie pobranie („stan, nie nazwa”).
6. **Ustawienia narzędzia:** adres serwera i hasło, zapamiętane na telefonie. Przy pierwszym wejściu narzędzie prosi o nie.

## Przepływ (API)

- `POST /info` `{url}` → `{title, thumbnail, duration, site, heights: [1080, 720, …]}`
- `POST /jobs` `{url, type: video|audio, height?, format: mp4|mp3|m4a, from?, to?}` → `{id}`
- `GET /jobs/:id` → `{status: running|done|error, progress, error?}`
- `GET /jobs/:id/file` → plik z `Content-Disposition: attachment`. Identyfikator losowy; plik usuwany po 1 h (można ponowić przesyłanie).

Zapis na telefonie jak w cobalt.tools: aplikacja ściąga plik do pamięci (z postępem), a „Zapisz” otwiera okno Udostępnij (iPhone: „Zachowaj wideo” → Zdjęcia, „Zachowaj w Plikach”). Powód: na iPhonie aplikacja z ekranu głównego nie pobiera plików linkiem. Limit 200 MB (pamięć karty). Android i komputer: zwykłe pobranie z pamięci.

## Stany (Dokumentacja_produktu.md, sekcja 2)

- **Pusty:** pole na link + podpowiedź „Wklej link do filmu albo utworu”. Pod spodem historia (albo nic, jeśli pusta).
- **Ładowanie:** szkielet karty w kształcie miniatury i tytułu, potem pasek postępu pobierania.
- **Błąd (przy polu):** „Ten serwis nie jest obsługiwany”, „Film jest prywatny albo usunięty”, „Nieprawidłowy czas fragmentu”, „Serwer nie odpowiada: czy komputer jest włączony?”, „Złe hasło”.
- **Offline:** „Pobieranie wymaga internetu”. Historia działa offline.

## Kontrakt narzędzia (sekcja 3)

- **Nazwa:** Pobieranie.
- **Ikona:** strzałka w dół do tacki (obecna ikona „eksport”). Placeholder „Eksport PDF” dostaje inną ikonę, żeby nie dzielić.
- **Stan:** tak (trwające pobieranie: kropka `--live`; liczba pobrań).
- **Dane:** historia i ustawienia lokalnie; samo pobieranie wymaga sieci i serwera.

## Otwarte

- Autostart serwera z Windows (później).
- Aktualizacja yt-dlp: zrobione, serwer aktualizuje go przy każdym starcie.

## Później

Udostępnij → HandyTools (Android), playlisty, napisy, treści po zalogowaniu (ciasteczka).

## Wersja 0.4.0: Pobieraczek (26.09.2026)

Ustalone w rozmowie (grilling), zbudowane:

- Nazwa w aplikacji: **Pobieraczek** (id `pobieranie` i klucze pamięci bez zmian).
- **Wklej:** `navigator.clipboard.read()` z typami `text/uri-list` i `text/plain` (aplikacje na iPhonie kopiują link jako URL, nie tekst); wklejenie w pole (`paste`) od razu sprawdza link; z tekstu wyciągany pierwszy `https://…`.
- **Rodzaje:** Wideo / Bez dźwięku / Audio.
- **Formaty:** wideo MP4 (H.264, Zdjęcia) i MKV (Pliki); audio MP3, M4A, FLAC, WAV; bitrate 320/256/192/128 kb/s dla MP3 i M4A.
- **Domyślne** w Ustawienia → Pobieraczek (serwer, format i jakość wideo, format i bitrate audio); w panelu zmieniane per pobranie. Jakość: preferowana, inaczej najbliższa niższa, inaczej najbliższa wyższa (`pickHeight`, test w `src/tools/pobieranie.test.js`).
- **Fragment:** suwak z dwoma uchwytami (`.ht-range`) + pola Od/Do.
- **Podgląd:** odtwarzacz z kopii 360p robionej na serwerze na żądanie (`/preview/:id/video`, Range), do 30 min materiału; inaczej lub przy błędzie stopklatki (`/preview/:id/frame?t=`).
- **Nazwa pliku:** pole z tytułem; serwer usuwa znaki niedozwolone, rozszerzenie dopisuje sam.
- **Rozmiar:** szacunek z danych serwisu (`/info`: `video[{height,size}]`, `audioSize`), proporcjonalnie do fragmentu; audio z bitrate.
- Serwer: jeden przebieg ffmpeg (`finalize`) robi plik końcowy: format, nazwa, H.264 dla MP4, `-an` dla „bez dźwięku”.
