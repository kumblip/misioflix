# MisioFlix — naprawa karuzeli Anime PL i ustawienia karuzel

Wariant: Z FLAGAMI. Data projektu: 23.11.2026.
Baza: aktualna paczka Role Anime PL/ENG/PL+ENG/Simkl.

## Co zmieniono

1. **Pusta karuzela Anime PL**: karuzela nadal korzysta z autoryzowanego ID biblioteki Jellyfina. Jeśli zapytanie o Series/Movie nie da wyników, w bibliotece anime próbuje dodatkowo pobrać jej bezpośrednie pozycje (jak natywny widok Jellyfin). Folder typu `Folder` jest dopuszczany wyłącznie wtedy, gdy ma `tvshow.nfo` lub `movie.nfo` i jest pod skonfigurowaną ścieżką anime. Nie rozpoznaje anime po dowolnej nazwie folderu.
2. **Wyszukiwarka anime**: dla biblioteki anime typu `mixed` dopuszczono foldery z NFO i klasyfikuje się je jako Series/Movie. Dla wyszukiwania zwykłych filmów i seriali zapytanie pozostaje bez dodatkowych folderów.
3. **Panel karuzel**: kolejność, widoczność, podgląd identyfikatora i ścieżek, przycisk edycji ścieżek przekierowujący do istniejącej konfiguracji biblioteki. Zapis po stronie serwera jako `HomeCarouselOrder` i `HiddenHomeCarousels`. Nowe biblioteki są automatycznie dopisywane, a zmiana nazwy nie zmienia powiązania.
4. **Kolekcje** mogą być przenoszone i ukrywane jak inne karuzele; ich odrębny widok i wyszukiwanie pozostają bez zmian.

## Wgranie przez samą stronę GitHub

1. Użyj tylko wariantu zgodnego z aktualną wersją (z flagami lub bez); nie mieszaj ich.
2. Rozpakuj ZIP. Prześlij **zmienione pliki**, a nie ZIP, do odpowiadających im folderów repo `kumblip/misioflix` (Code → odpowiedni folder → Add file → Upload files → Commit changes).
3. Pozostaw istniejący `.github/workflows` bez zmian. Nowy numer wydania wyznacza obecny workflow automatycznie.
4. Sprawdź wynik `Actions` (testy i kompilacja .NET). Dopiero potem opublikuj wydanie przyciskiem `Run workflow` z zatwierdzeniem `PUBLIKUJ`.
5. W Jellyfinie otwórz panel MisioFlixa → **Biblioteki Jellyfin — ścieżki i klasyfikacja**, sprawdź Anime PL: `/media/raid/anime_lektor` i rolę Anime PL; zapisz jeśli trzeba. Otwórz **Karuzele strony głównej** → ułóż kolejność, zaznacz widoczność → Zapisz, przeładuj stronę główną.
6. Sprawdź Anime PL (strona główna), Anime ENG, wyszukiwarkę anime, MAL, Simkl, ekran sezonów i obrazy. Porównaj z biblioteką Jellyfina (u Ciebie 603 pozycje w Anime PL).

## Diagnostyka, jeśli nadal pusta

- Sprawdź, czy natywna biblioteka nadal pokazuje 603 pozycje.
- Podaj log z GitHub Actions, jeżeli kompilacja lub testy nie przejdą.
- W narzędziach deweloperskich przeglądarki (Sieć/Network), sprawdź odpowiedź `/MisioFlix/api/home/shelf?libraryId=53e751439e5d36e699d03863df66b710&mode=latest&startIndex=0&limit=10`. Ważne są `items` i kod HTTP; nie publikuj tokenów autoryzacyjnych.
- Jeżeli w odpowiedzi nadal będzie `items: []`, przyczyną może być rzeczywisty typ encji, niewłaściwe NFO lub mapowanie ścieżki Jellyfina; sama statyczna analiza kodu nie dowodzi, że problem już zniknął.

## Ograniczenia i bezpieczeństwo

Nie zmieniono plików mediów, NFO, obrazów, nazw bibliotek ani uprawnień Jellyfina. Nie wykonano testu na NAS użytkownika ani kompilacji .NET (środowisko nie zawiera dotnet). Wykonane testy automatyczne Python/Node nie zastępują testu integracyjnego Jellyfin.

Zgodność: bazowa wtyczka Jellyfin 12.4, funkcje MAL/Simkl pozostają w kodzie, automatyczna numeracja wydań bez zmian.
