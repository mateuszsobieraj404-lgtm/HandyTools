# HandyTools

Dokumentacja produktu. Plik jest punktem odniesienia przy dopisywaniu każdego nowego ekranu, panelu i narzędzia.

Wartości wizualne (kolory, rozmiary, promienie, czasy) nie są tu powtarzane. Jedynym źródłem jest `Design System/handytools-tokens.css`, opisany w `Design System/handytools-system-wizualny.md`. Dwa miejsca z tymi samymi liczbami to przepis na rozjazd; wersja 1.1 powstała po to, żeby go usunąć.

---

## 0. Stan projektu: start od zera

**Ustalony jest tylko system wizualny** (sekcja 4 i pliki, do których odsyła). Funkcje aplikacji Mateusz wymyśla sam i będą dopisywane tutaj, gdy zapadnie decyzja.

Wszystko, co funkcjonalne w makietach, to **przykład**, nie zakres i nie propozycja zakresu:

- narzędzia (listy sprzętu, kalkulator, konwerter, notatki, skaner QR, miarka, kalendarz, eksport PDF, stoper),
- pozycje paska dolnego (Ustawienia, Aktualizacje, Wsparcie, Własna, Skróty),
- panel skrótów i jego akcje,
- sekcja „Ostatnie",
- ekran logowania, rejestracja i konto.

Makiety pokazują układ, gęstość ekranu i zachowanie komponentów. Nie buduj niczego na założeniu, że któraś z tych funkcji musi powstać, i nie przenoś ich nazw do nowych ekranów bez decyzji.

**Ustalone narzędzia**

- **Pobieranie** (wrzesień 2026): wideo i audio z linku, ok. 1800 serwisów (yt-dlp), wybór jakości, przycinanie, historia. Wymaga serwera na komputerze (`server/`). Szczegóły: `.scratch/pobieranie/spec.md`.

---

## 1. Czym jest HandyTools

Webowa aplikacja na telefon, w której siedzi zestaw drobnych narzędzi. Jedno wejście zamiast kilkunastu osobnych apek i zakładek w przeglądarce.

**Dla kogo:** autor i kilka zaufanych osób. Ktoś, kto w biegu potrzebuje szybko coś zrobić jednym narzędziem. Telefon w jednej ręce, druga zajęta. Narzędzia są ogólne, bez jednej branży. Pełny opis produktu: `PRODUCT.md`.

**Zasady (potwierdzone we wrześniu 2026)**

1. **Narzędzie otwiera się w dwa dotknięcia.** Menu to wyrzutnia, nie katalog.
2. **Narzędzia mogą ze sobą współpracować.** Przyszłe narzędzia będą od siebie zależne. Zależność ma być jawna; narzędzie bez swojego partnera mówi, czego brakuje, zamiast się psuć.
3. **Stan przetrwa zamknięcie karty.** Wpisane dane mają być na miejscu po powrocie.
4. **Aplikacja nie zagaduje.** Zero onboardingu, powiadomień marketingowych i pustych ekranów powitalnych.
5. **Prywatne z założenia.** Dane zostają u autora; nic prywatnego nie trafia do publicznego repozytorium.

Czy będzie konto, logowanie i synchronizacja, nie jest ustalone.

---

## 2. Wzorce z makiet (przykładowe)

Te układy sprawdzają się w makietach i są gotowe do użycia, ale żaden nie jest obowiązkowy. Zawartość (nazwy, pozycje, liczba elementów) wynika z funkcji, które powstaną.

- **Menu jako rozdzielacz:** nagłówek, wyszukiwarka, sekcja z kartami stanu, siatka kafli narzędzi, pasek dolny.
- **Pasek dolny:** stały na ekranach aplikacji, najwyżej pięć pozycji (więcej się nie zmieści przy 390 px), najwyżej jedna wyróżniona.
- **Karty stanu:** jeśli narzędzie ma bieżący stan, karta pokazuje **stan, nie nazwę** (ile pozycji, ile czasu).
- **Nakładka zamiast ekranu:** doraźny wybór albo szybka akcja jako arkusz nad bieżącym ekranem, z rozmytym tłem.
- **Szybka akcja:** jeśli kiedyś powstanie, musi skończyć się w jednym dotknięciu; wszystko, co wymaga formularza, jest narzędziem.

**Stany, które trzeba zaprojektować dla każdego narzędzia:** pusty (z podpowiedzią co zrobić), ładowanie (szkielet w kształcie treści, nie spinner), błąd (komunikat przy elemencie, którego dotyczy), offline (co działa, co czeka na sieć).

---

## 3. Kontrakt nowego narzędzia

Dodając narzędzie, ustal:

- **Nazwa:** jedno albo dwa słowa, rzeczownik. Mieści się w jednej linii pod kaflem (do ~14 znaków).
- **Ikona:** z zestawu konturowego (system wizualny, sekcja 5). Ma czytać się przy 30 px na kaflu i przy 22 px w studzience. Ta sama ikona wszędzie, gdzie narzędzie się pojawia; nie może powtarzać ikony innej funkcji.
- **Stan:** czy narzędzie ma bieżący stan do pokazania, czy jest bezstanowe.
- **Dane:** co zapisuje lokalnie, co ewentualnie wymaga sieci.

Ekran narzędzia trzyma ten sam szkielet: nagłówek z powrotem i tytułem, treść, pasek dolny. Nie wymyślaj własnej nawigacji wewnątrz narzędzia.

---

## 4. System wizualny

Pełny opis: `handytools-system-wizualny.md` (wersja 1.1). Wartości: `handytools-tokens.css`. Przykładowe ekrany: `handytools_makieta_pogladowa.html`. Poniżej tylko zasady, które decydują o spójności; liczby są w plikach.

1. **Jeden motyw, ciemny.** Sześć szarości z jednej rodziny, siódmej nie ma.
2. **Stopień zależy od roli.** Na tle ekranu kontrolki stoją na `--ht-surface`, treść na `--ht-raised`, wgłębienia na `--ht-recess`. Na arkuszu wszystko o stopień wyżej (`--ht-hover`).
3. **Stany są wspólne.** Najazd zawsze `--ht-hover`, wciśnięcie zawsze `--ht-press` + skala, fokus zawsze ten sam pierścień akcentu, także na polach.
4. **Akcent w ośmiu rolach i nigdzie indziej:** akcja główna, wyróżniona pozycja paska, tekst kasowania, tekst błędu, ikona w studzience, kropka stanu, pierścień fokusu, logo z poblaskiem. Kasowanie nigdy nie jest wypełnione.
5. **Skale są krótkie:** sześć rozmiarów tekstu w dziewięciu rolach, sześć promieni, trzy rozmiary ikon, jedna wysokość kontrolki, trzy skale wciśnięcia.
6. **Ruch coś znaczy.** Animujemy tylko `transform` i `opacity`; pętla wyłącznie przy realnym stanie.
7. **Zero wartości z palca.** Brakuje tokenu? Dopisz go z rolą do `handytools-tokens.css` i opisz w systemie wizualnym, potem użyj.

---

## 5. Komponenty

Katalog komponentów z wymiarami i stanami jest w `handytools-system-wizualny.md`, sekcja 11, a klasy w `handytools-tokens.css`. Każdy nowy panel składa się z tych klocków. Jeśli potrzebujesz czegoś, czego tam nie ma, dopisz komponent do obu plików razem z regułą, kiedy się go używa.

---

## 6. Budowa nowego panelu, krok po kroku

1. **Ustal, czy to ekran czy nakładka.** Treść samodzielna to ekran. Doraźny wybór albo potwierdzenie to nakładka z rozmyciem tła.
2. **Zacznij od szkieletu:** `.ht-screen` (w makiecie 390 × 844, w implementacji `min-height: 100dvh`).
3. **Poblask marki** `.ht-glow` jako pierwszy element.
4. **Nagłówek** `.ht-header` (na ekranie narzędzia `.ht-header--tool` z powrotem i `h1`).
5. **Treść** w blokach `.ht-section-block`, każdy z nagłówkiem `.ht-section`, jeśli ma więcej niż jeden element.
6. **Nie powtarzaj tego samego układu dwa razy** na jednym ekranie. Siatka, karty i lista to trzy różne rytmy; dwa wystarczą.
7. **Pasek dolny** `.ht-bar` na końcu.
8. **Dopisz stany:** pusty, ładowanie, błąd, offline.
9. **Sprawdź listę kontrolną** z sekcji 7 i z systemu wizualnego.

---

## 7. Lista kontrolna przed zamknięciem zmiany

Wizualna lista kontrolna jest w `handytools-system-wizualny.md`, sekcja 12. Do tego produktowo:

- [ ] Funkcja jest decyzją, nie kopią przykładu z makiety.
- [ ] Narzędzie spełnia kontrakt z sekcji 3.
- [ ] Stany pusty, ładowania, błędu i offline istnieją.
- [ ] Ekran narzędzia ma szkielet: nagłówek z powrotem i tytułem, treść, pasek dolny.
- [ ] Żadnej wartości wpisanej z palca; nowy token dopisany z rolą.

---

## 8. Czego nie robić

- Nie traktować funkcji z makiet jako ustalonych.
- Nie dokładać więcej niż pięciu pozycji do paska dolnego ani więcej niż jednej wyróżnionej.
- Nie wprowadzać drugiego koloru akcentu ani gradientów jako dekoracji.
- Nie budować ekranu z samych identycznych kafli; bez rytmu wygląda jak plakat, nie jak aplikacja.
- Nie używać `--ht-recess` pod pola wpisywania.
- Nie dublować wartości z `handytools-tokens.css` w dokumentach ani w komponentach.
- Nie dokładać ikony z akcentem poza studzienką i wyróżnioną pozycją paska.
- Nie animować w pętli niczego, co nie pokazuje realnego stanu.
- Nie zakrywać całego ekranu panelem, który dotyczy jednej rzeczy.
- Nie wstawiać pełnego logo z nazwą nigdzie poza ekranem wejściowym (jeśli taki będzie).
- Nie pisać tekstów marketingowych w interfejsie. Etykieta mówi, co się stanie po dotknięciu.

---

## 9. Pliki źródłowe

- `Design System/handytools-tokens.css` - tokeny i klasy komponentów, źródło wszystkich wartości (v1.1).
- `Design System/handytools-system-wizualny.md` - opis systemu: kiedy której wartości użyć, katalog komponentów, lista kontrolna, historia zmian.
- `Design System/handytools_makieta_pogladowa.html` - przykładowe ekrany zbudowane wyłącznie z klas tokenów; treść jest poglądowa.
- Logo: `HandyTools_logo/` - sygnet, pełne logo, wersja pozioma, wersja ze sloganem. Kopie w aplikacji: `src/sygnet.png` (nagłówek) i `public/icons/` (ikona PWA). Brakuje wersji wektorowej (SVG), warto ją mieć pod ikonę aplikacji i druk.
