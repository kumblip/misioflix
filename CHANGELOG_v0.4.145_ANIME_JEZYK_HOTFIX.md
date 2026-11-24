# MisioFlix 0.4.145.0 — HOTFIX języka wyszukiwarki anime

Baza: 0.4.144.0, kandydat do testu na NAS, nie STABLE.

- W katalogu biblioteki anime autoryzowany identyfikator ParentId i przypisana przez administratora rola anime_pl / anime_eng / anime_both mają pierwszeństwo przed potencjalnie niejednoznacznym członkostwem fizycznych folderów elementu. Dotyczy serii, filmów, sezonów i folderów z NFO. Bez skonfigurowanej roli pozostaje poprzednia klasyfikacja członkostwa / ścieżki. Globalny katalog propozycji bez ParentId pozostaje bez zmian.
- Unieważniono stare migawki katalogu w IndexedDB (v7); zakres serwer/użytkownik/biblioteka bez zmian. Nie odświeżamy indeksu audio, nie analizujemy mediów, nie zmieniamy konfiguracji bibliotek ani danych MAL/SIMKL.
- Wybór Polski (lektor), Bez lektora (ENG), Wszystkie (PL + ENG), domyślny PL, rola anime_both widoczna w obu trybach, niezależne filtry bibliotek i przełącznik sezonów — bez zmiany semantyki i wyglądu. Zaznaczone osobne sezony domyślnie pokazują tylko sezony.
- Pełna paginacja katalogu 144 bez limitu 16 000 pozostaje nienaruszona. Brak nowych zmian diagnostyki.

Weryfikacja lokalna: 600 testów Python, 74 skrypty Node — PASS. Nowe testy Python sprawdzają kontrakt źródłowy C# i autoryzację, test JS wykonuje rzeczywiste funkcje klienta na symulowanych odpowiedziach katalogów. Nie jest to test rzeczywistego serwera Jellyfin. SDK .NET 10 i NAS niedostępne; przyczyna zgłoszenia wymaga potwierdzenia po wdrożeniu. Nie publikowano w GitHubie.
