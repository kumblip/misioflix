# Wdrożenie MisioFlix 0.4.30 (integracja MAL)

1. Archiwum jest **nakładką** na istniejące, działające repozytorium GitHub v0.4.29. Nie usuwaj innych plików źródłowych, istniejącej usługi MAL, konfiguracji ani workflow.
2. Rozpakuj ZIP i nadpisz pliki, zachowując ścieżki od katalogu głównego repozytorium (`src/...`, `meta.json`, `tests/current/...`). Nie trzeba aktualizować `.github/workflows/build.yml` lub `release.yml`.
3. Uruchom GitHub Actions i upewnij się, że rzeczywiście skompilowano DLL. Wersja w `meta.json` to `0.4.30.0`.
4. Wgraj zbudowaną DLL do Jellyfin i zrestartuj kontener. W przeglądarce wykonaj Ctrl+Shift+R.
5. Na stronie głównej przy bibliotekach kliknij **Połącz MAL**. Autoryzacja jest indywidualna dla zalogowanego użytkownika Jellyfin.
6. Gdy redirect jest `http://localhost:8765/callback`, po autoryzacji może pojawić się błąd „nie można połączyć”. Skopiuj pełny URL z paska (parametry `code` i `state`), wróć do MisioFlix i wybierz **Zakończ łączenie**. Nie udostępniaj tego adresu innym osobom. Jeśli zmienisz redirect w MAL na publicznie osiągalną ścieżkę `/MisioFlix/api/mal/callback` swojej instancji Jellyfin, musi być identycznie ustawiony w konfiguracji MisioFlix; konieczne jest także bezpieczne HTTPS.
7. Otwórz szczegóły anime lub konkretnego sezonu, który ma MAL ID w `tvshow.nfo` / `season.nfo`. Pojawi się panel MAL; kliknij **Zapisz w MAL** po zmianie danych.
8. Dane w panelu mogą pochodzić z pamięci lokalnej (1h). **Odśwież z MAL** ręcznie wymusza aktualizację; nie ma ciągłego automatycznego pollingu.

## Co zostaje osobne

Status oglądania MAL **nie oznacza automatycznie wszystkich odcinków jako odtworzone w Jellyfin**. Zapisuje się na MAL i w panelu MAL. W historii odtwarzacza, plikach NFO, ocenach zbiorczych i na kontach innych użytkowników nie są dokonywane zmiany.

## Diagnostyka

- Brak przycisku logowania: sprawdź, czy skrypt `/MisioFlix/assets/mal.js?v=0.4.30.0` zwraca 200.
- Brak panelu: sprawdź, czy biblioteka jest sklasyfikowana jako anime i czy NFO ma MAL ID odpowiednio dla serii/sezonu.
- HTTP 502: problem łączności po stronie serwera z MAL; nie powtarzaj wielokrotnie żądań. 
- HTTP 400 przy ręcznym zakończeniu: adres kodu jest niepełny, stan OAuth wygasł albo redirect nie zgadza się z konfiguracją.
