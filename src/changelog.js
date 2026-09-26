// Historia zmian widoczna w aplikacji (pasek → Aktualizacje).
// Każda zmiana, nowość albo poprawka → nowy wpis NA GÓRZE listy, z nową wersją.
// Rodzaje: 'Nowe', 'Poprawka', 'Zmiana'.
export const changelog = [
  {
    version: '0.7.0',
    date: '2026-09-26',
    title: 'Dopracowany wygląd i dopasowanie do telefonu',
    items: [
      ['Zmiana', 'Pasek dolny jest niższy i przylega do dolnej krawędzi ekranu, na całą szerokość, z cienką linią u góry.'],
      ['Poprawka', 'Aplikacji nie da się już przypadkiem powiększyć: ani dwoma palcami, ani dwukrotnym dotknięciem, ani przy dotknięciu pola tekstowego.'],
      ['Zmiana', 'Marginesy dopasowują się do szerokości telefonu, więc na małych ekranach nic się nie ściska.'],
      ['Zmiana', 'Panel Pobieraczka jest prostszy: grupy oddzielone cienkimi liniami, bieżący wybór i rozmiar w nagłówku każdej grupy, wszystkie wybory w jednym stylu przełączników.'],
      ['Nowe', 'Przycisk „Pobierz” jest przyklejony nad paskiem, zawsze pod kciukiem.'],
    ],
  },
  {
    version: '0.6.0',
    date: '2026-09-26',
    title: 'Nowy panel Pobieraczka',
    items: [
      ['Zmiana', 'Panel po sprawdzeniu linku ma nowy układ: duży podgląd z tytułem na górze, a pod nim wyraźne grupy Fragment, Co pobrać, Jakość, Format i Plik.'],
      ['Nowe', 'Wideo, Bez dźwięku i Audio to kafle z ikonami. Wybrany świeci na czerwono.'],
      ['Nowe', 'Jakość, format i bitrate wybierasz pigułkami zamiast list, a pod każdą widać rozmiar pliku dla tej opcji.'],
      ['Nowe', 'Przycisk „Pobierz” pokazuje rozmiar pliku, a nagłówek „Fragment” pokazuje, ile wybrano.'],
      ['Zmiana', 'Odtwarzanie fragmentu to przycisk ▶ między polami Od i Do. Nazwę pliku zmieniasz dotknięciem wiersza z ołówkiem.'],
    ],
  },
  {
    version: '0.5.2',
    date: '2026-09-26',
    title: 'Home na pasku',
    items: [
      ['Zmiana', 'Na pasku dolnym zamiast „Wsparcie” jest „Home”: powrót do menu głównego z każdego ekranu. W menu przycisk jest podświetlony.'],
    ],
  },
  {
    version: '0.5.1',
    date: '2026-09-26',
    title: 'Prywatność',
    items: [
      ['Zmiana', 'Log błędów serwera (zawiera pobierane linki) leży teraz poza folderem projektu, w %LOCALAPPDATA%\\HandyTools, więc nie może trafić do publicznego repozytorium.'],
      ['Zmiana', 'Commity w repozytorium podpisane ukrytym adresem e-mail GitHuba zamiast prywatnego.'],
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-26',
    title: 'Posty z wieloma elementami i zdjęcia',
    items: [
      ['Nowe', 'Pobieraczek pobiera zdjęcia: Instagram, TikTok (pokazy slajdów), X, Reddit, Pinterest i setki innych serwisów.'],
      ['Nowe', 'Post z wieloma elementami (karuzela, pokaz slajdów, wpis z kilkoma filmami) pokazuje siatkę miniatur. Zdjęcia zaznaczasz i zapisujesz naraz jednym oknem Udostępnij (→ Zdjęcia). Film dotykasz i ustawiasz jak zwykle: jakość, fragment, format.'],
      ['Poprawka', 'Wpis z kilkoma filmami nie pobiera już tylko pierwszego.'],
      ['Zmiana', 'Instagram i Reddit korzystają z logowania w Firefoksie na komputerze, tak jak X. Bez logowania Instagram pokazuje posty ze zdjęciami tylko zalogowanym.'],
      ['Zmiana', 'Serwer przy starcie aktualizuje też gallery-dl (program do zdjęć), obok yt-dlp.'],
    ],
  },
  {
    version: '0.4.1',
    date: '2026-09-26',
    title: 'Znacznik pozycji',
    items: [
      ['Nowe', 'Pobieraczek: znacznik pozycji na suwaku fragmentu. Linia pokazuje, w którym miejscu jest podgląd, a pinezkę pod suwakiem można złapać i przewijać cały materiał.'],
      ['Zmiana', '„Odtwórz fragment” gra od pinezki, jeśli stoi w wybranym fragmencie. W przeciwnym razie od „Od”.'],
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-26',
    title: 'Pobieraczek',
    items: [
      ['Zmiana', 'Narzędzie „Pobieranie” nazywa się teraz „Pobieraczek”. Historia i ustawienia zostały.'],
      ['Poprawka', 'Przycisk „Wklej” na iPhonie: linki skopiowane z aplikacji (YouTube, X, TikTok…) są teraz odczytywane. Link wklejony przytrzymaniem pola od razu się sprawdza.'],
      ['Nowe', 'Fragment wybierasz suwakiem z dwoma uchwytami. Pola Od i Do do wpisania zostały i działają razem z suwakiem.'],
      ['Nowe', 'Podgląd fragmentu: odtwarzacz przeskakuje w miejsce uchwytu, a „Odtwórz fragment” gra dokładnie wybrany kawałek. Gdy odtwarzacz nie zadziała albo materiał ma ponad 30 minut: stopklatki z początku i końca.'],
      ['Nowe', 'Trzeci rodzaj pliku: „Bez dźwięku” (sam obraz).'],
      ['Nowe', 'Formaty: wideo MP4 lub MKV, audio MP3, M4A, FLAC lub WAV. Bitrate audio 128–320 kb/s dla MP3 i M4A.'],
      ['Nowe', 'Własna nazwa pobieranego pliku (domyślnie tytuł). Rozszerzenie dopisuje się samo.'],
      ['Nowe', 'Szacowany rozmiar pliku, aktualizowany przy zmianie jakości, formatu, bitrate i fragmentu.'],
      ['Nowe', 'Ustawienia → Pobieraczek: serwer, domyślny format i jakość wideo (gdy jej nie ma, najbliższa niższa), domyślny format i bitrate audio.'],
      ['Zmiana', 'Ustawienia serwera przeniesione z narzędzia do zakładki Ustawienia.'],
    ],
  },
  {
    version: '0.3.1',
    date: '2026-09-26',
    title: 'X po zalogowaniu',
    items: [
      ['Nowe', 'Pobieranie z X wpisów ukrytych przed niezalogowanymi (treść wrażliwa): serwer korzysta z logowania do X w Firefoksie na komputerze. Tylko dla linków z X, inne serwisy działają bez logowania.'],
      ['Zmiana', 'Komunikat przy ukrytym filmie z X podpowiada, co włączyć w ustawieniach X.'],
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-26',
    title: 'Aktualizacje',
    items: [
      ['Nowe', 'Ekran Aktualizacje z pełną historią zmian aplikacji.'],
      ['Nowe', 'Kropka przy „Aktualizacje” na pasku, gdy jest wersja, której jeszcze nie oglądałeś.'],
      ['Poprawka', 'X: zamiast ogólnego błędu jasny komunikat, gdy film jest ukryty przed niezalogowanymi (zwykle treść oznaczona jako wrażliwa).'],
    ],
  },
  {
    version: '0.2.3',
    date: '2026-09-26',
    title: 'Facebook i jakość',
    items: [
      ['Poprawka', 'Filmy z Facebooka i innych serwisów w formacie AV1 lub VP9 są konwertowane do H.264, więc zapisują się w Zdjęciach na iPhonie. Nowy etap: „Konwertuję do H.264”.'],
      ['Poprawka', 'Wybrana jakość jest górnym limitem: 720p daje najwyżej 720p (wcześniej mogło przyjść 1152p).'],
      ['Poprawka', 'Tytuły z Facebooka bez doklejonych liczników „views · reactions”.'],
      ['Poprawka', 'Drugie dotknięcie „Zapisz” przy otwartym oknie Udostępnij nie wywołuje już błędu.'],
      ['Zmiana', 'Po zakończeniu ekran sam przewija się do przycisku „Zapisz”, który chował się pod paskiem.'],
      ['Zmiana', 'Serwer zapisuje błędy do pliku, żeby dało się szybko sprawdzić, dlaczego coś się nie pobrało.'],
    ],
  },
  {
    version: '0.2.2',
    date: '2026-09-26',
    title: 'Zapis do Zdjęć na iPhonie',
    items: [
      ['Poprawka', 'Zapisywanie na iPhonie: plik ściąga się do telefonu z postępem, a „Zapisz” otwiera okno Udostępnij („Zachowaj wideo” → Zdjęcia, „Zachowaj w Plikach”). Wcześniej aplikacja z ekranu głównego nie mogła zapisać pliku.'],
      ['Nowe', 'Przycisk „Spróbuj ponownie”, gdy przesyłanie na telefon się przerwie. Plik czeka na komputerze godzinę.'],
      ['Nowe', 'Komunikat dla plików powyżej 200 MB z propozycją niższej jakości albo krótszego fragmentu.'],
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-26',
    title: 'Połączenie z komputerem',
    items: [
      ['Nowe', 'Stały adres HTTPS do serwera na komputerze (Tailscale Funnel), działa także po restarcie.'],
      ['Nowe', 'Serwer uruchamiany dwuklikiem: start-serwer.bat.'],
      ['Nowe', 'Adres serwera otwarty w przeglądarce podpowiada, gdzie go wpisać.'],
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-24',
    title: 'Narzędzie Pobieranie',
    items: [
      ['Nowe', 'Pobieranie wideo i audio z linku z ok. 1800 serwisów (YouTube, Facebook, TikTok, Instagram, X i inne) przez serwer na komputerze.'],
      ['Nowe', 'Przycisk „Wklej”: wstawia link ze schowka i od razu go sprawdza. Karta z miniaturą, tytułem, serwisem i czasem trwania.'],
      ['Nowe', 'Wybór Wideo albo Audio, jakości (tylko tych, które serwis faktycznie ma) i formatu audio: MP3 albo M4A.'],
      ['Nowe', 'Przycinanie: pola „Od” i „Do” (np. 1:05 albo 1:02:03).'],
      ['Nowe', 'Postęp w procentach. Pobieranie wznawia się po wyjściu z narzędzia i powrocie.'],
      ['Nowe', 'Historia 20 ostatnich pobrań. Dotknięcie wpisu pobiera link jeszcze raz.'],
      ['Nowe', 'Sekcja „Ostatnie” w menu z kartą stanu pobierania.'],
      ['Nowe', 'Ustawienia serwera: adres i hasło, sprawdzane przy zapisie.'],
      ['Zmiana', 'Zablokowane przyciski są wygaszone. Na ekranie jest naraz tylko jedna czerwona akcja.'],
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-23',
    title: 'Pierwsza wersja',
    items: [
      ['Nowe', 'Menu główne: logo, wyszukiwarka narzędzi (działa też bez polskich znaków), siatka kafli z przyciskiem „Wszystkie”.'],
      ['Nowe', 'Pasek dolny: Ustawienia, Aktualizacje, Wsparcie, Własna i wyróżnione Skróty.'],
      ['Nowe', 'Panel Skróty z czterema skrótami do narzędzi. Zamykanie krzyżykiem, klawiszem Esc albo dotknięciem tła.'],
      ['Nowe', 'Panel Własna: wolne miejsce na pasku.'],
      ['Nowe', 'Ekrany narzędzi i podstron z przyciskiem powrotu do menu.'],
      ['Nowe', 'Instalacja na ekranie głównym telefonu: ikona z sygnetem, ciemny motyw, font Manrope.'],
      ['Nowe', 'Stały adres aplikacji (GitHub Pages). Każda zmiana trafia do aplikacji automatycznie.'],
    ],
  },
];

const SEEN = 'ht.aktualizacje.widziane';

// Kropka na pasku: jest wersja, której użytkownik jeszcze nie oglądał.
export const hasNew = () => {
  try {
    return localStorage.getItem(SEEN) !== changelog[0].version;
  } catch {
    return false;
  }
};

export const markSeen = () => {
  try {
    localStorage.setItem(SEEN, changelog[0].version);
  } catch {
    /* prywatne okno: kropka wróci, nic więcej */
  }
};

const date = (iso) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric' });

export const changelogHtml = () => changelog.map((v) => `
  <section class="ht-section-block" aria-labelledby="v-${v.version}">
    <div class="ht-section-head">
      <h2 class="ht-section" id="v-${v.version}">${v.version} · ${v.title}</h2>
      <span class="ht-meta">${date(v.date)}</span>
    </div>
    <ul class="ht-list">
      ${v.items.map(([kind, text]) => `<li><span class="ht-section">${kind}</span><span class="ht-lead">${text}</span></li>`).join('')}
    </ul>
  </section>`).join('');
