# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Aplikacja webowa na telefon (PWA), instalowana na ekranie głównym. Głównie iPhone; zaufani użytkownicy mogą mieć też Androida.

## Users

Autor i kilka zaufanych osób (rodzina, znajomi), którym autor przekazuje dostęp. Nie jest to produkt publiczny: nie ma kont, rejestracji ani obcych użytkowników.

Sytuacja: telefon w jednej ręce, w biegu albo w trakcie innej czynności. Zadanie: szybko coś zrobić jednym narzędziem (pobrać materiał, policzyć, sprawdzić) i wrócić do swojej pracy.

## Product Purpose

Jedno miejsce na drobne narzędzia zamiast kilkunastu osobnych aplikacji i zakładek w przeglądarce. Zestaw narzędzi rośnie z czasem; autor wymyśla je sam. Narzędzia są ogólne, na co dzień, bez jednej branży.

Sukces: narzędzie otwiera się od razu i kończy zadanie bez szukania, czytania instrukcji i powiększania ekranu.

## Positioning

Osobisty zestaw narzędzi budowany pod własne potrzeby autora i jego bliskich, a nie pod rynek. Własny serwer w domu zamiast cudzych usług (Pobieraczek), więc dane i linki nie wychodzą poza telefon i komputer autora.

## Operating Context

- Otwierana z ikony na ekranie głównym, zwykle na iPhonie, w pionie, jedną ręką.
- Pobieraczek działa przez serwer na komputerze autora w domu; zaufane osoby dostają do niego dostęp od autora. Bez włączonego komputera Pobieraczek nie działa.
- Zmiany trafiają do aplikacji automatycznie po wypchnięciu na GitHub (GitHub Pages); repozytorium jest publiczne.

## Capabilities and Constraints

- **Narzędzia:** Pobieraczek (wideo, dźwięk i zdjęcia z linku, ok. 1800 serwisów, wycinanie fragmentu, zapis do Zdjęć na iPhonie) i Konwerter (obrazy, audio, wideo, PDF i dokumenty; w całości w telefonie, bez serwera). Pobieraczek przekazuje pliki do Konwertera. Pozostałe kafle w menu są poglądowe, z makiety.
- **Konwerter bez serwera:** decyzja autora (bez instalacji na komputerze i na przyszłym Raspberry Pi). Excel/PowerPoint → PDF i wierny układ Word ↔ PDF wymagałyby LibreOffice na serwerze: poza zakresem na teraz.
- **Język:** polski.
- **Prywatność:** linki, historia i ustawienia zostają na telefonie i komputerze autora. Do publicznego repozytorium nie trafiają dane użytkownika ani dane dostępowe.
- **Bez powiększania ekranu:** świadoma decyzja autora (aplikacja ma działać jak natywna), mimo że ogranicza to osoby korzystające z powiększania gestem.
- **Każda zmiana** dostaje wpis w historii zmian w aplikacji (ekran Aktualizacje) i GitHub Release.
- **Nierozstrzygnięte:** konta i synchronizacja między urządzeniami; praca Pobieraczka bez włączonego komputera (Raspberry Pi, stary laptop albo chmura); zestaw kolejnych narzędzi.

## Brand Commitments

- Nazwa: HandyTools. Slogan: „Many tools. One place.”
- Logo: sygnet i pełne logo w `HandyTools_logo/`; sygnet jest ikoną aplikacji.
- Głos: aplikacja nie zagaduje. Etykieta mówi, co się stanie po dotknięciu; błąd mówi, co poszło nie tak i co zrobić. Zero tekstów marketingowych w interfejsie.
- System wizualny już istnieje i obowiązuje: `Design System/` (tokeny, opis, makieta).

## Evidence on Hand

- Logo: `HandyTools_logo/` (PNG; brak wersji wektorowej SVG).
- Makieta ekranów: `Design System/handytools_makieta_pogladowa.html` (treść poglądowa).
- Dokumentacja produktu: `Dokumentacja_produktu.md`.
- Brak opinii użytkowników, statystyk i materiałów prasowych; nie wolno ich wymyślać.

## Product Principles

1. **Narzędzie w dwa dotknięcia.** Menu to wyrzutnia, nie katalog do przeglądania.
2. **Narzędzia mogą ze sobą współpracować.** Przyszłe narzędzia będą od siebie zależne (np. jedno korzysta z wyniku drugiego); zależność ma być jawna, a narzędzie bez swojego partnera mówi, czego brakuje, zamiast się psuć.
3. **Stan przetrwa zamknięcie.** Wpisane dane, trwające zadania i ustawienia są na miejscu po powrocie.
4. **Aplikacja nie zagaduje.** Zero onboardingu, powiadomień marketingowych i pustych ekranów powitalnych.
5. **Prywatne z założenia.** Dane zostają u autora; nic prywatnego nie trafia do publicznego repozytorium.

## Accessibility & Inclusion

- Kontrast tekstu co najmniej 4,5:1, pola dotyku co najmniej 44 × 44 px, widoczny fokus (szczegóły w systemie wizualnym).
- Powiększanie gestem wyłączone decyzją autora (patrz Capabilities and Constraints); pozostałe potrzeby nie zostały zgłoszone.
