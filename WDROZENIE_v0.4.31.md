# MisioFlix v0.4.31 — wdrożenie małej poprawki MAL

1. Rozpakuj ZIP i nadpisz w repozytorium pliki, zachowując strukturę katalogów.
2. Nie modyfikuj `.github/workflows/build.yml` ani `.github/workflows/release.yml`.
3. Uruchom GitHub Actions Build. Następnie zainstaluj nową skompilowaną paczkę Jellyfin z wersją **0.4.31.0**, zrestartuj kontener i odśwież przeglądarkę `Ctrl+Shift+R`.
4. Na stronie głównej potwierdź, że „MAL: [konto]” nadal wskazuje połączonego użytkownika.
5. Otwórz anime z MAL ID wpisanym do NFO. Panel powinien przestać migotać i przejść do formularza oceny/statusu albo pokazać konkretny błąd.
6. Jeśli pojawi się błąd, zapisz jego **treść bez tokenów/OAuth code/sekretu**. Najważniejsze rozróżnienie: „Ten tytuł nie ma MAL ID w NFO”, „HTTP 404/502 przy odczycie katalogu anime/NFO”, „MAL nie jest połączony”, „błąd pobierania danych z MAL”.

Brak bezpośrednich, ciągłych odpytań MAL z głównej. Dane szczegółów są pobierane dla otwartej pozycji, z lokalnym cache. Ponawianie po błędzie jest ręczne. Nie usuwaj ani nie odtwarzaj konfiguracji OAuth — połączenie konta powinno pozostać zachowane.
