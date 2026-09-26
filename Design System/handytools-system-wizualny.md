# HandyTools - system wizualny

Wersja 1.1, wrzesień 2026. Motyw jest jeden: ciemny. Żadna sekcja nie udaje jasnej.

**Źródło prawdy.** Wartości żyją w `handytools-tokens.css`. Ten plik opisuje, kiedy której użyć. `CLAUDE.md` nie powtarza liczb, tylko odsyła tutaj. Jeśli coś się nie zgadza, poprawia się token, a potem opis. Wartość wpisana z palca w komponencie to błąd, nawet jeśli wygląda dobrze.

Pliki: `handytools-tokens.css` (tokeny i klasy), `handytools_makieta_pogladowa.html` (przykładowe ekrany zbudowane wyłącznie z tych klas).

**System opisuje wygląd, nie zawartość.** Nazwy narzędzi, pozycji paska i akcji w przykładach (Skróty, Aktualizacje, stoper, „Ostatnie” itd.) pochodzą z makiet i są poglądowe. Funkcje aplikacji nie są jeszcze ustalone.

---

## 1. Kolor

### Drabina powierzchni

Sześć szarości z jednej rodziny: R = G, B wyżej o 2-7 i rośnie z jasnością. Kroki mają po 7-8 punktów jasności. Siódmej szarości nie ma.

| Stopień | Token | Wartość | Rola |
|---|---|---|---|
| 0 | `--ht-bg` | `#08080A` | tło ekranu |
| 1 | `--ht-recess` | `#0F0F13` | wgłębienie: studzienka ikony, tor przełącznika |
| 2 | `--ht-surface` | `#17171B` | kontrolka na tle: kafel, pole, wyszukiwarka, przycisk drugorzędny, pasek |
| 3 | `--ht-raised` | `#1E1E23` | treść na tle: karta, awatar; arkusz; pole z fokusem |
| 4 | `--ht-hover` | `#26262C` | najazd; spoczynek elementu na arkuszu |
| 5 | `--ht-press` | `#2E2E35` | wciśnięcie; najazd na arkuszu; aktywny segment |

**Gdzie co stoi**

- Na tle ekranu: **kontrolki** (to, co się obsługuje) na `--ht-surface`, **treść** (to, co pokazuje stan) na `--ht-raised`.
- Wgłębienia (studzienka, tor przełącznika) zawsze na `--ht-recess`, niezależnie od podłoża.
- Na arkuszu wszystko, co na nim stoi (karta akcji, przycisk drugorzędny, przycisk ikonowy), jest o stopień wyżej od arkusza: `--ht-hover`.

**Stany (jedna reguła dla wszystkiego, co da się dotknąć)**

| Stan | Tło | Obrys |
|---|---|---|
| Spoczynek | według tabeli wyżej | `--ht-line` |
| Najazd | `--ht-hover` | `--ht-line-strong` |
| Wciśnięcie | `--ht-press` + skala | `--ht-line-strong` |
| Na arkuszu: najazd i wciśnięcie | `--ht-press` (+ skala) | `--ht-line-strong` |
| Pole z fokusem | `--ht-raised` + pierścień fokusu | bez zmian |

Najazd i wciśnięcie mają zawsze swój kolor, niezależnie od koloru spoczynku. Dzięki temu kafel, karta i przycisk reagują identycznie.

### Obrysy

Biel z przezroczystością, dwa stopnie:

- `--ht-line` 8%: obrys w spoczynku, wewnętrzne światło arkusza, linia podziału.
- `--ht-line-strong` 14%: najazd, górna krawędź arkusza, uchwyt arkusza.

### Tekst i ikony

| Token | Wartość | Rola | Kontrast do `--ht-raised` |
|---|---|---|---|
| `--ht-text` | `#F7F5F1` | tytuły, tekst główny, najazd na tekst i ikonę | 15,2:1 |
| `--ht-label` | `#C4C4CB` | etykieta kafla, przycisk tekstowy, inicjały w awatarze | 9,6:1 |
| `--ht-muted` | `#9EA0A6` | opis, podpis, etykieta pola, karty i paska | 6,4:1 |
| `--ht-faint` | `#86868E` | placeholder, elementy wygaszone, strzałka w karcie | 4,6:1 |
| `--ht-icon` | `#EDEDF0` | ikona neutralna | 14,2:1 |

Najazd na tekst lub ikonę zmienia kolor na `--ht-text`, nie na czystą biel. `#FFFFFF` nie występuje w interfejsie.

### Akcent

`--ht-accent: #FF3B30`, kontrast 5,6:1 do tła ekranu. Napis na wypełnieniu akcentem jest ciemny (`--ht-on-accent: #0B0B0D`, 5,5:1). Biały dałby 3,5:1 i nie przechodzi AA przy 15 px.

Akcent ma osiem ról, zebranych w cztery grupy, i nigdzie indziej:

| Grupa | Role |
|---|---|
| Akcja | wypełnienie akcji głównej; ikona wyróżnionej pozycji paska (najwyżej jednej) |
| Ostrzeżenie | tekst kasowania; tekst błędu pod polem |
| Znak | ikona w studzience; kropka stanu; pierścień fokusu |
| Marka | logo; poblask marki |

- **Kasowanie** to czerwony tekst bez wypełnienia. Przy najeździe tło `--ht-hover`, tekst `--ht-accent-hover` (4,7:1 na tym tle; zwykły akcent miałby tu 4,2:1).
- **Ikona w studzience** jest w akcencie. Ikona bez studzienki (karta mała, kafel) jest neutralna, w `--ht-icon`.
- **Poblask marki**: `--ht-glow`, radialny gradient akcentu na 5%, wysokość 300 px, pierwszy element ekranu, `pointer-events: none`. Powyżej 5% czyta się jak alarm.

### Warstwy pochodne

Nie są nowymi kolorami, tylko istniejącymi tokenami z przezroczystością:

- `--ht-scrim`: tło ekranu na 50% (bez przezroczystości systemowej 94%).
- `--ht-sheet`: `--ht-raised` na 90%.
- `--ht-shadow-sheet`: `0 -24px 60px` czerni na 45%.

---

## 2. Typografia

**Manrope**, zmienny, wagi 400-600, pełne polskie znaki. Jedna rodzina w całej aplikacji. Font self-hostowany z `font-display: swap`.

Sześć rozmiarów, dziewięć ról:

| Klasa | Rola | Rozmiar / waga / tracking | Interlinia | Kolor |
|---|---|---|---|---|
| `.ht-title` | nagłówek ekranu narzędzia, arkusza, panelu | 20 / 600 / -0.025em | 1.2 | `--ht-text` |
| `.ht-value` | wartość na karcie małej (czas, licznik) | 17 / 600 / -0.02em, `tabular-nums` | 1.2 | `--ht-text` |
| `.ht-card-title` | tytuł karty (szerokiej i akcji); napis przycisku | 15 / 600 / -0.015em | 1.2 | `--ht-text` |
| - | tekst w polu wpisywania | 15 / 400 | - | `--ht-text` |
| `.ht-section` | nagłówek sekcji; aktywny segment; przycisk tekstowy | 13.5 / 600 / -0.01em | 1.3 | `--ht-text` |
| `.ht-lead` | zdanie wiodące, opis pod nagłówkiem | 13.5 / 400 | 1.45 | `--ht-muted` |
| `.ht-tile-label` | etykieta kafla | 12.5 / 500 | 1.3 | `--ht-label` |
| `.ht-meta` | etykieta pola, etykieta karty małej, chip (600) | 12.5 / 500 | 1.3 | `--ht-muted` |
| `.ht-caption` | opis karty, podpis | 12.5 / 400 | 1.3 | `--ht-muted` |
| `.ht-bar-label` | etykieta paska dolnego | 10.5 / 500 | 1.3 | `--ht-muted` |

- Ujemny tracking tylko przy wadze 600 i rozmiarze od 13.5 px. Mniejsze napisy mają tracking 0.
- Liczby zmieniające się w miejscu zawsze `font-variant-numeric: tabular-nums`, inaczej skaczą co sekundę.
- Tekst w karcie jest zawsze w jednej linii; nadmiar ucina wielokropek. Opisy pisz tak, żeby się mieściły (karta akcji: do ~18 znaków).

---

## 3. Kształt

Jedna drabina promieni:

| Token | Promień | Elementy |
|---|---|---|
| `--ht-r-sheet` | 34 px | arkusz (górne rogi) |
| `--ht-r-xl` | 26 px | kafel narzędzia, pasek dolny |
| `--ht-r-lg` | 22 px | karta szeroka, mała, akcji |
| `--ht-r-md` | 16 px | przycisk, pole, wyszukiwarka, tor przełącznika |
| `--ht-r-sm` | 12 px | studzienka, awatar, przycisk ikonowy, segment, pigułka w pasku |
| `--ht-r-xs` | 10 px | chip, próbka koloru, mały znacznik |

Zasady: im mniejszy element, tym mniejszy promień. Kontener nigdy nie ma promienia mniejszego niż to, co w nim siedzi. Tam, gdzie element siedzi w torze z paddingiem, promienie są współśrodkowe (tor 16 - padding 4 = segment 12). Kropka i uchwyt są zaokrąglone w całości.

---

## 4. Wymiary, odstępy i siatka

**Wymiary kontrolek**

| Token | Wartość | Element |
|---|---|---|
| `--ht-control` | 52 px | pole, wyszukiwarka, każdy przycisk z tekstem |
| `--ht-segment` | 40 px | segment przełącznika (tor 50 px) |
| `--ht-chip` | 30 px | chip |
| `--ht-icon-btn` | 38 px | awatar, przycisk ikonowy |
| `--ht-well` | 44 px | studzienka ikony w każdej karcie |
| `--ht-tile` | 92 px | wysokość kafla i karty małej |
| `--ht-action` | 112 px | wysokość karty akcji |
| `--ht-bar-h` | 82 px | wysokość paska dolnego |

Kafel ma wysokość 92 px i szerokość kolumny (około 99 px przy ekranie 390 px). Nie jest kwadratem.

**Odstępy**

- Margines ekranu i arkusza: **26 px**. Jedyny wyjątek to pasek dolny: 16 px po bokach, 22 px od dołu plus `env(safe-area-inset-bottom)`.
- Między blokami ekranu (nagłówek, wyszukiwarka, sekcje): **26 px**.
- Wewnątrz sekcji, między kartami: **12 px**.
- Formularz: etykieta → pole 7 px, pole → pole 16 px.
- Siatka narzędzi: 3 kolumny, odstęp 22 px w pionie i 20 px w poziomie, kafel → etykieta 11 px.
- Padding każdej karty: 15 px.
- Nagłówek: 36 px od góry. Logo na ekranie wejściowym bez nagłówka (np. logowanie w makiecie): 68 px od góry.

Ekran referencyjny: 390 × 844 px.

---

## 5. Ikony

Jeden zestaw konturowy, `viewBox="0 0 24 24"`, bez wypełnienia, zaokrąglone końce i łączenia. Zero emoji, zero ikon z wypełnieniem.

Trzy rozmiary i dwie grubości (grubość w jednostkach viewBox):

| Klasa | Rozmiar | `stroke-width` | Gdzie |
|---|---|---|---|
| `.ht-i--tile` | 30 px | 1.5 | kafel |
| `.ht-i--md` | 22 px | 1.5 | studzienka, karta mała, pasek |
| `.ht-i--sm` | 18 px | 1.75 | przy tekście: pole, przycisk, strzałka w karcie, zamknięcie |

Grubsza kreska przy 18 px to kompensacja optyczna: przy 1.5 mała ikona wygląda na cieńszą od reszty.

Jedno narzędzie ma jedną ikonę wszędzie, gdzie się pojawia (kafel, karta, skrót). Dwie różne funkcje nie dzielą ikony (np. Aktualizacje i Eksport PDF).

---

## 6. Ruch

Krzywa dla wszystkich przejść: `--ht-ease` = `cubic-bezier(0.22, 0.61, 0.36, 1)`. Wyjątek: pętle (kropka, szkielet) mają `ease-in-out`, bo nie mają początku ani końca.

| Zdarzenie | Parametry |
|---|---|
| Zmiana koloru, tła, obrysu | 200 ms |
| Wciśnięcie | 220 ms; skala: kafel 0.955, karta i przycisk z tekstem 0.982, mały element (pozycja paska, chip, przycisk ikonowy) 0.93 |
| Wejście bloku | 460 ms, `translateY(12px)` + opacity; bloki co 50 ms od 40 ms (`.ht-in` + `--i`) |
| Kaskada w siatce i w arkuszu | 30 ms na element (`.ht-stagger` + `--start`) |
| Przyciemnienie pod arkuszem | 320 ms |
| Wyjazd arkusza | 460 ms, `translateY(28px)` |
| Kropka trwającego procesu | puls 2400 ms, opacity 1 → 0.4 |
| Szkielet ładowania | 2400 ms, opacity 1 → 0.55 |

Animujemy wyłącznie `transform` i `opacity`. Nigdy `width`, `height`, `top`, `left`.

Ruch musi coś znaczyć: hierarchię, sekwencję, potwierdzenie dotyku albo zmianę stanu. Pętla jest dozwolona tylko dla realnego stanu (proces trwa, dane się ładują). Na planszach i w dokumentacji nic nie oddycha dla ozdoby.

---

## 7. Panele nakładkowe

Panel, który nie zakrywa całego ekranu, zostawia tło **widoczne i rozmyte**:

- przyciemnienie `--ht-scrim` (tło ekranu na 50%) plus `backdrop-filter: blur(16px) saturate(115%)`,
- arkusz `--ht-sheet`, górna krawędź `--ht-line-strong`, wewnętrzne światło `--ht-line`, cień `--ht-shadow-sheet`, promień 34 px,
- padding arkusza 12 px u góry i 26 px po bokach i u dołu (plus safe area),
- uchwyt 38 × 4 px w `--ht-line-strong`, wyśrodkowany,
- nagłówek arkusza: `.ht-title` + `.ht-caption`, po prawej przycisk zamknięcia (przycisk ikonowy).

`prefers-reduced-transparency: reduce` wyłącza rozmycie: przyciemnienie 94%, arkusz pełne `--ht-raised`.

---

## 8. Dostępność

- Kontrast tekstu minimum 4,5:1, liczony na tle, na którym tekst faktycznie leży (także w stanie najazdu i fokusu). Tabela kontrastów jest w sekcji 1.
- Pole dotyku minimum 44 × 44 px. Elementy mniejsze wizualnie (chip, segment, awatar, przycisk ikonowy) dostają `.ht-hit`, które powiększa pole dotyku bez zmiany wyglądu.
- Fokus: `2px solid` akcentu, offset 2 px. Ten sam pierścień na przyciskach, kaflach, kartach **i polach**. Nie zdejmujemy go nigdzie.
- Etykieta nad polem, nigdy placeholder zamiast etykiety. Błąd pod polem. Wyjątek: wyszukiwarka ma etykietę ukrytą dla oczu (`.ht-sr-only`), bo lupa i placeholder mówią, co robi.
- Ikona bez tekstu dostaje `aria-label`, ikona dekoracyjna `aria-hidden="true"`. Kropka stanu ma `role="img"` i `aria-label` albo jej znaczenie jest w etykiecie przycisku.
- Jeden `h1` na ekran. Jeśli wizualnie zastępuje go logo, `h1` jest ukryty (`.ht-sr-only`).
- `prefers-reduced-motion: reduce` wyłącza wejścia i pętle, przejścia skraca do 1 ms.

---

## 9. Wdrożenie webowe

- `min-height: 100dvh`, nigdy `100vh`: pasek adresu w Safari powoduje skok układu.
- Pasek dolny i arkusz odsunięte o `env(safe-area-inset-bottom)`.
- Font self-hostowany, nie przez `<link>` do Google Fonts.
- Ikona PWA: sygnet na tle `--ht-bg`.
- Ekran ma najwyżej `--ht-screen-max` (480 px) szerokości i jest wyśrodkowany; na tablecie i komputerze nie rozciąga się.
- Pasek dolny jest przyklejony (`position: sticky`): przy długiej treści zostaje na dole widoku. Dlatego `.ht-screen` ma `overflow: clip`, nie `hidden`.
- Przyciemnienie i arkusz są przypięte do okna (`position: fixed`), arkusz ma tę samą maksymalną szerokość co ekran.
- Wyjazd arkusza: klasa `.is-closing` na `.ht-scrim` i `.ht-sheet`, usunięcie z DOM po `animationend` arkusza.

---

## 10. Logo

| Wariant | Gdzie | Rozmiar |
|---|---|---|
| Sygnet | nagłówki ekranów, ikona aplikacji | 34 × 30 px (30 px wysokości) |
| Sygnet + nazwa ze sloganem | wyłącznie ekran wejściowy (w makiecie: logowanie), blok wyśrodkowany, sygnet po lewej, odstęp 14 px | sygnet 53 × 46, nazwa 166 × 38 |

Wersja na ciemne tło: napis `#F7F5F1`, slogan `#9EA0A6`, czerwień z oryginału. Czerwień logo (`#F5322B`) i akcent (`#FF3B30`) są wizualnie nierozróżnialne, więc nie korygujemy żadnego z nich.

Wersja achromatyczna z pakietu ma wypalone białe tło i nie nadaje się na ciemny ekran. Brakuje wersji wektorowej (SVG) pod ikonę aplikacji i druk.

---

## 11. Komponenty

Wszystkie w `handytools-tokens.css`. Jeśli potrzebujesz czegoś, czego tu nie ma, dopisz komponent tutaj i w CSS razem z regułą, kiedy się go używa.

**Nagłówek ekranu** `.ht-header` - sygnet po lewej, awatar po prawej. Na ekranie narzędzia (`.ht-header--tool`): przycisk ikonowy „wstecz" (strzałka 18 px) i tytuł `h1.ht-title`.

**Awatar** `.ht-avatar` - 38 × 38, `--ht-raised`, promień 12, obrys, inicjały 12.5/600 w `--ht-label`, `.ht-hit`.

**Przycisk ikonowy** `.ht-icon-btn` - 38 × 38, promień 12, ikona 18 px. Na tle `--ht-surface`, na arkuszu `--ht-hover`. Zawsze `aria-label` i `.ht-hit`.

**Wyszukiwarka** `.ht-field.ht-field--search` - to samo pole co w formularzu (52 px, promień 16), lupa 18 px w `--ht-faint`, tekst od 46 px.

**Pole formularza** `.ht-field-group` - etykieta `.ht-field-label` nad polem (odstęp 7 px), pole 52 px na `--ht-surface`, tekst 15 px. Przycisk wewnątrz pola (np. „Pokaż") to przycisk tekstowy `.ht-field__action`. Błąd `.ht-field-error` pod polem.

**Kafel narzędzia** `.ht-tile` - lico 92 px wysokości na `--ht-surface`, promień 26, ikona 30 px w `--ht-icon`, etykieta `.ht-tile-label` 11 px pod licem.

**Karta szeroka** `.ht-card` - `--ht-raised`, promień 22, padding 15, studzienka 44 px z ikoną 22 px w akcencie, tytuł `.ht-card-title` + opis `.ht-caption`, strzałka 18 px w `--ht-faint`.

**Karta mała** `.ht-card-sm` - 92 px, `--ht-raised`, promień 22, padding 15. Góra: ikona 22 px w `--ht-icon` i opcjonalna kropka stanu. Dół: wartość `.ht-value` i etykieta `.ht-meta`. Wartość to **stan** („12:41", „4 kody"), etykieta to nazwa narzędzia.

**Karta akcji** `.ht-card-action` (w arkuszu) - 112 px, `--ht-hover`, promień 22, padding 15. Góra: studzienka 44 px z ikoną narzędzia w akcencie, opcjonalna kropka. Dół: tytuł `.ht-card-title` i opis `.ht-caption`.

**Studzienka** `.ht-well` - 44 × 44, `--ht-recess`, promień 12, ikona 22 px w akcencie.

**Pasek dolny** `.ht-bar` - 82 px, `--ht-surface`, promień 26, pięć pozycji o równej szerokości. Każda pozycja ma pole ikony **34 × 30 px** (ten sam gabaryt we wszystkich pozycjach, inaczej etykiety rozjeżdżają się w pionie), ikonę 22 px i etykietę `.ht-bar-label`.
- Pozycja wyróżniona (`.ht-bar__item--primary`, w makiecie: Skróty), najwyżej jedna: pigułka `--ht-raised` pod ikoną, ikona w akcencie, etykieta `--ht-text` 600. Zawsze, na każdym ekranie.
- Pozycja, której ekran jest otwarty (`aria-current="page"`): etykieta `--ht-text` 600, bez akcentu i bez pigułki.
- Pozycja pusta, nieprzypisana (`.ht-bar__item--empty`, w makiecie: „Własna”): ikona w `--ht-faint` z przerywanym konturem.

**Przyciski** `.ht-btn`

| Wariant | Tło | Tekst | Najazd |
|---|---|---|---|
| `--primary` | `--ht-accent` | `--ht-on-accent` | `--ht-accent-hover` |
| `--secondary` | `--ht-surface` (na arkuszu `--ht-hover`) | `--ht-text` | `--ht-hover` (na arkuszu `--ht-press`) |
| `--danger` | brak, obrys `--ht-line` | `--ht-accent` | tło `--ht-hover`, tekst `--ht-accent-hover` |

Zablokowany (`:disabled`, np. w trakcie operacji): tło `--ht-surface`, tekst `--ht-faint`, bez reakcji na dotyk. Na ekranie jest jedna aktywna akcja główna naraz; gdy pojawia się następna (np. „Sprawdź” → „Pobierz”), poprzednia przechodzi w `--secondary`.

Wszystkie 52 px, promień 16, napis 15/600, ikona 18 px, odstęp 9 px. Etykieta przycisku głównego to najwyżej trzy słowa, zawsze jedna linia.

**Przycisk tekstowy** `.ht-btn-text` - 13.5/600 w `--ht-label`, najazd `--ht-text`, pole dotyku 44 px wysokości.

**Chip** `.ht-chip` - 30 px, promień 10, 12.5/600 w `--ht-muted`, bez tła; najazd `--ht-hover`, `.ht-hit`.

**Przełącznik segmentowy** `.ht-segmented` - 2 albo 3 równe segmenty (np. Wideo / Bez dźwięku / Audio); tor na `--ht-recess`, padding 4, promień 16. Segment 40 px, promień 12, 13.5 px. Aktywny: `--ht-press`, `--ht-text`, 600. Nieaktywny: `--ht-muted`, 500. `.ht-hit` na segmentach.

**Kropka stanu** `.ht-dot` - 7 × 7 px, okrągła, akcent. Dwa znaczenia i nic poza nimi:
- statyczna: coś nowego czeka (jest aktualizacja),
- pulsująca `.ht-dot--live`: proces trwa teraz (np. działający stoper).

**Suwak zakresu** `.ht-range` - wybór odcinka (np. fragment od-do): dwa natywne `input[type=range]` na jednym torze. Tor `--ht-recess` (wgłębienie, jak tor przełącznika) o grubości `--ht-range-track`, wybrany odcinek `--ht-press`, uchwyty `--ht-range-thumb` w `--ht-text`, pole dotyku 44 px. Bez akcentu: to nie jest żadna z jego ośmiu ról. Pozycje odcinka przez zmienne `--from` i `--to` (0…1). Zawsze z polami tekstowymi obok, żeby dało się wpisać wartość.

**Znacznik pozycji** `.ht-range__head` + `.ht-playhead` - gdzie jest odtwarzanie na suwaku zakresu: pionowa linia na torze i pinezka (nóżka + główka w `--ht-text`) w osobnym pasie pod torem, pole dotyku 44 px. Pinezkę łapie się i przewija cały materiał. Osobny pas, bo leżąc na torze zasłaniałaby uchwyty zakresu. Tylko przy odtwarzaczu (przy stopklatkach ukryty).

**Panel wyboru** (np. po sprawdzeniu linku). `.ht-stack` układa bloki z odstępem `--ht-gap-section`, `.ht-group` to nagłówek `.ht-section` + zawartość z odstępem `--ht-gap`. Na górze `.ht-media`: podgląd na całą szerokość, pod nim tytuł `.ht-title` (najwyżej 2 linie) i opis. Wybory nie są rozwijanymi listami, tylko:
- **Kafle wyboru** `.ht-option` (2–3 w rzędzie, `aria-pressed`): wysokość karty akcji (112 px, etykieta do 2 linii), `--ht-surface`, wybrany `--ht-press`. Ikona w studzience świeci akcentem tylko w wybranym kaflu, w pozostałych jest `--ht-faint`.
- **Pigułki wyboru** `.ht-choice` w przewijanym rzędzie `.ht-choices` (od krawędzi do krawędzi ekranu, przyciąganie): etykieta 13.5/600 + podpis 12.5 (np. rozmiar pliku dla tej opcji). Wybrana `--ht-press`.
- **Wiersz nazwy** `.ht-filename`: wygląda jak pole z ołówkiem, dotknięcie zamienia go w pole.
- **Rząd fragmentu** `.ht-trim`: pole Od, kwadratowy przycisk ▶, pole Do.

**Siatka miniatur** `.ht-thumbs` + `.ht-thumb` - elementy posta (karuzela, pokaz slajdów): 3 kolumny, odstęp `--ht-gap`, kwadratowe miniatury na `--ht-raised`, promień `--ht-r-lg`. Zdjęcie do zaznaczania: `aria-pressed`, w prawym górnym rogu kółko `--ht-thumb-mark` z ptaszkiem (jasne = zaznaczone, sam obrys = odznaczone), odznaczone zdjęcie wygaszone do `--ht-dim`. Film: znaczek ▶ i czas w lewym dolnym rogu na `--ht-scrim-solid`, wybrany film obrysowany `--ht-text` (`aria-current`). Bez akcentu.

**Podgląd** `.ht-preview` - odtwarzacz albo stopklatka w ramce 16:9 na `--ht-recess`, promień `--ht-r-lg`, obraz dopasowany bez przycinania.

**Lista tekstowa** `.ht-list` - pionowa lista bez punktorów, odstęp `--ht-gap`. Każdy element: krótka etykieta `.ht-section` (np. „Nowe”, „Poprawka”) nad opisem `.ht-lead`. Dla treści do czytania (historia zmian), nie do dotykania; lista klikalna to karty.

**Stan pusty** `.ht-empty` - wyśrodkowana kolumna: studzienka z ikoną ekranu, tytuł `.ht-card-title`, podpowiedź `.ht-lead` (co zrobić albo co się tu pojawi). Odstępy `--ht-gap`, pion `--ht-gap-section`. Bez ilustracji i bez tekstów marketingowych.

**Szkielet ładowania** `.ht-skeleton` - bloki `--ht-surface` w kształcie i promieniu docelowej treści, powolny oddech opacity. Bez spinnera.

**Arkusz** `.ht-scrim` + `.ht-sheet` - opis w sekcji 7.

---

## 12. Lista kontrolna

- [ ] Każdy kolor, promień, rozmiar, odstęp i czas pochodzi z tokenu. Nic wpisanego z palca.
- [ ] Element stoi na właściwym stopniu (kontrolka na `--ht-surface`, treść na `--ht-raised`, na arkuszu `--ht-hover`), stany z tabeli w sekcji 1.
- [ ] Akcent wyłącznie w ośmiu rolach. Ikona w akcencie tylko w studzience i w wyróżnionej pozycji paska.
- [ ] Promienie z drabiny, kontener nie mniejszy niż zawartość.
- [ ] Margines ekranu i arkusza 26 px, między blokami 26 px, w sekcji 12 px.
- [ ] Ikony z jednego zestawu, trzy rozmiary, jedno narzędzie = jedna ikona.
- [ ] Tekst z dziewięciu ról typograficznych; tekst w karcie w jednej linii.
- [ ] Pola dotyku ≥ 44 px (`.ht-hit` tam, gdzie element jest mniejszy), pierścień fokusu wszędzie, także na polach.
- [ ] Kontrast ≥ 4,5:1 na faktycznym tle, także w stanie najazdu.
- [ ] Animowane tylko `transform` i `opacity`; pętla tylko przy realnym stanie.
- [ ] `prefers-reduced-motion` i `prefers-reduced-transparency` obsłużone.
- [ ] Stany pusty, ładowania i błędu istnieją.
- [ ] Jeden `h1` na ekran, etykieta nad polem, błąd pod polem.
- [ ] `100dvh`, nie `100vh`. Safe area pod paskiem i arkuszem.

---

## 13. Zmiany w wersji 1.1 (ujednolicenie)

Wersja 1.0 miała cztery źródła (CLAUDE.md, ten plik, tokens.css, makieta), które mówiły różne rzeczy. Co ujednolicono:

**Kolor**
- Stany najazdu i wciśnięcia były raz względne (+1/+2 stopnie), raz bezwzględne. Teraz zawsze `--ht-hover` / `--ht-press`. Drugorzędny przycisk na tle miał najazd `--ht-raised`, teraz `--ht-hover` jak wszystko.
- Karta akcji: dokumentacja mówiła `--ht-surface`, makieta `--ht-raised` (ten sam kolor co arkusz). Teraz `--ht-hover`, zgodnie z regułą „na arkuszu o stopień wyżej". To samo przycisk zamknięcia arkusza (był niewidoczny na tle arkusza).
- Lista ról akcentu miała pięć pozycji, a akcent był używany w ośmiu (kasowanie, błąd, studzienki w karcie akcji, Skróty w pasku, poblask). Lista jest teraz pełna i zamknięta. Ikona karty małej w „Ostatnich" jest neutralna, bo nie ma studzienki.
- Przyciemnienie pod arkuszem: 50% w dokumentach, 52% na planszy, w makiecie brak koloru w ogóle. Teraz 50%, liczone z tła ekranu (wcześniej osobny kolor `rgb(6,6,9)`).
- Uchwyt arkusza `#3F3F46` był siódmą szarością spoza rodziny. Teraz `--ht-line-strong` (ten sam wygląd).
- Trzy przezroczystości obrysu (8, 12, 14%) i światło arkusza (6 vs 8%) zredukowane do dwóch: 8 i 14%.
- `--ht-faint` z `#83838B` na `#86868E`: placeholder w polu z fokusem (na `--ht-raised`) miał 4,4:1, teraz 4,6:1.
- Najazd na tekst i ikony dawał czystą biel `#FFFFFF`, spoza palety. Teraz `--ht-text`.
- Tekst kasowania na tle najazdu miał 4,2:1. Teraz przy najeździe `--ht-accent-hover` (4,7:1).
- Reguła „B wyżej o 4" nie zgadzała się z własnymi wartościami (faktycznie +2 do +7). Opis poprawiony, wartości bez zmian.

**Typografia**
- 14 rozmiarów w użyciu (10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 17, 20, 22, 27) zredukowane do 6: 20, 17, 15, 13.5, 12.5, 10.5.
- Karta akcji 14.5 → 15, wyszukiwarka 14 → 15, etykieta karty małej i opis karty akcji 12 → 12.5, chip 12 → 12.5, link 13 → 13.5, przyciski 13.5 i 14.5 → 15.
- Dopisane interlinie (1.2 / 1.3 / 1.45). Brak interlinii powodował wypychanie treści poza kartę małą.
- Tracking ±0.005em usunięty (niewidoczny, a różnił się między ekranami).

**Kształt**
- Zakresy „14-15", „12-15", „10-11" zastąpione jedną wartością na poziom. Pole 14/15 → 16 (jak przycisk tej samej wysokości). Studzienka 13/15 → 12. Awatar 13 → 12. Chip 10/11 → 10.

**Wymiary**
- Kontrolki 46, 50, 52 i 54 px → wszystkie 52 px.
- Studzienki 46 i 40 px → 44 px.
- Pasek dolny: dokument mówił 72 px, makieta renderowała 82 px. Teraz 82 px wprost.
- Kafel był opisany jako „kwadrat 92 px", a w siatce ma ok. 99 × 92. Opis poprawiony.
- Padding kart 14/15/16 → 15. Arkusz miał margines 22 px, teraz 26 jak ekran. Odstępy w sekcji 12/14 → 12. Nagłówek → wyszukiwarka 20 → 26. Na logowaniu 34/22 → 26.

**Ikony**
- Dziewięć rozmiarów (16, 17, 18, 20, 21, 22, 23, 30, 32) → trzy (30, 22, 18). Pięć grubości kreski (1.5, 1.6, 1.7, 1.8) → dwie (1.5 i 1.75 dla 18 px).
- Aktualizacje i Eksport PDF miały tę samą ikonę. Aktualizacje dostały strzałkę odświeżania.
- Skróty używają ikon swoich narzędzi (wcześniej „Skanuj kod" i „Skaner QR" miały różne ikony).

**Ruch**
- Wejście 400/440/460/480/520 ms → 460 ms. Przesunięcie 10/12 → 12 px, arkusz 28/30 → 28 px. Krok bloków 50/60 ms → 50 ms, kaskada 30/35/40 ms → 30 ms.
- Wciśnięcie kafla 240 → 220 ms. Skale 0.9, 0.94, 0.955, 0.972, 0.982, 0.983, 0.985 → trzy: 0.955, 0.982, 0.93. Karty nie zmieniały tła przy wciśnięciu, teraz `--ht-press` jak kafle.
- Kropka: dokument mówił, że pulsuje przy aktualizacji, CSS ją zatrzymywał, rozmiary 6 i 7 px. Teraz 7 px, statyczna = nowość, pulsująca = trwający proces.
- Poblask na logowaniu miał 320 px i 22%, reszta 300 px i 18%. Teraz wszędzie tak samo.
- Plansza systemu miała ozdobną pętlę na kaflu, sprzeczną z regułą ruchu. Usunięta.

**Dostępność**
- Pola zdejmowały pierścień fokusu (`outline: none`) wbrew regule. Teraz ten sam pierścień co wszędzie.
- Segment 40 px, chip 30 px, awatar 38 px i przycisk zamknięcia 34 px nie spełniały własnej reguły 44 px. Dodane `.ht-hit`.
- Menu główne nie miało `h1`. Dodany (ukryty).
- Karta „Skaner QR" pokazywała nazwę jako wartość, wbrew zasadzie „stan, nie nazwa". Teraz „4 kody" / „Skaner QR".
- Hasło na logowaniu miało placeholder „Minimum 8 znaków" (wymóg rejestracji). Usunięty.

**Inne**
- Wersja: plansza mówiła „v5", dokument „Wersja 1". Teraz 1.1 wszędzie.
- Makieta miała przełącznik alternatywnych akcentów (beż, zieleń, brąz) wbrew „jeden akcent". Usunięty.
- Plansza systemu była ucięta na 844 px i pomijała `--ht-faint` i `--ht-icon`. Teraz pełna.
- Tokeny promieni nazwane rolą (`--ht-r-bar` używany do kafla) → nazwy według rozmiaru (`--ht-r-xl` itd.). `--ht-line-hover` → `--ht-line-strong`, bo ma trzy role.
