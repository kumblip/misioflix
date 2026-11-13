# MisioFlix Native v0.4.51.0 — oceny Simkl i układ mobilny

## Podstawa i bezpieczeństwo
- Podstawa: v0.4.50.0 po poprawce kompilacji (`SIMKL_BUILD_FIX`).
- Stabilny punkt odzyskiwania pozostaje **v0.4.45.0** — niezmieniony.
- Integracja MAL (anime) i jej pliki, klasy i logika nie są współdzielone z modułem ocen Simkl.

## Ocenianie na plakatach
- Filmy i seriale poza AnimePL: **własna ocena użytkownika Simkl (1–10) + różowa łapka**, jeśli jest dostępna w lokalnej kopii Simkl na NAS.
- Filmy: tylko ocena + różowa łapka — bez liczników sezonów lub odcinków.
- Seriale: dotychczasowa liczba sezonów / odcinków z kolorowymi łapkami oraz nowy trzeci wiersz oceny Simkl.
- Brak osobistej oceny Simkl: nie pokazujemy oceny IMDb/Jellyfin jako zamiennika.
- Odczyt zbiorczy do 36 pozycji, ograniczony do uprawnionych pozycji danego użytkownika Jellyfina. Serwer nie pobiera danych z Simkl przy wyświetlaniu pojedynczych kart; używa pliku lokalnej kopii użytkownika.
- Przy przełączaniu kont Jellyfin usuwane są poprzednie oceny z widocznych kart, zanim zacznie się ładowanie nowych.

## Wygląd Android / iOS / mobilna przeglądarka
- Wyszukiwarka filmów i seriali: 3 kolumny przy wąskim ekranie, kompaktowe plakietki, podpisy i gatunki jak w wyszukiwarce anime.
- Standardowe karty filmów i seriali: kompaktowe plakietki i rozmiary typografii na małych ekranach; zachowane istniejące układy i zdarzenia natywnego Jellyfina.
- Osobne znaczniki i reguły `mf-simkl-*` w `simkl.css`; bez podmiany klas MAL.
- Kolekcje: `2 🎬`, `5 🎬` zamiast `2 filmów`, `5 filmów`; dostępna etykieta ARIA nadal opisuje liczbę filmów.

## Weryfikacja
- Testy Pythona, Node.js i kontrola DOM/CSS w mobilnym Chromium (393 px).
- **Niekompilowane lokalnie:** kompilację .NET 10 należy potwierdzić przez GitHub Actions.
- Po instalacji uruchomić ponownie Jellyfin i odświeżyć przeglądarkę (`Ctrl+F5`).
