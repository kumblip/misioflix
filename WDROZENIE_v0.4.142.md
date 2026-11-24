# Wdrożenie 0.4.142.0 (hotfix diagnostyki)

1. Rozpakuj ZIP z pełnymi zmienionymi plikami do głównego katalogu repozytorium zawierającego 0.4.141.0. Nadpisz wskazane pliki; nie usuwaj pozostałych. Nie nadpisuj manifest.json.
2. Commit i push, uruchom build. Zainstaluj artefakt testowy zgodnie z dotychczasową procedurą, a po testach publikuj przez release / PUBLIKUJ.
3. Po aktualizacji zrestartuj Jellyfin, wykonaj Ctrl+F5 w przeglądarce, zaloguj się jako administrator.
4. Otwórz ustawienia MisioFlix → Diagnostyka wydajności. Kliknij Włącz. Oczekiwany stan: „Serwer: włączona · ta karta: włączona”.
5. Przejdź na Home w tej samej karcie bez przeładowania, przełącz filtry, wróć do panelu i kliknij Odśwież wyniki. Wyeksportuj JSON.
6. Jeżeli stan nie zostanie potwierdzony, przekaż dokładny komunikat z panelu (bez tokenów). HTTP 404: sprawdź aktualnie zainstalowaną wersję i restart. HTTP 401/403: sprawdź sesję administratora. Po limicie czasu odśwież wyniki przed ponowieniem.

Nie oznaczać STABLE przed testem na NAS-ie. Następne planowane wydanie po tym hotfixie: usunięcie limitu katalogu (numer przesunięty).
