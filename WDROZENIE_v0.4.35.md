# Wdrożenie v0.4.35

1. Na bazie istniejącej v0.4.34 rozpakuj pliki źródłowe z ZIP z zachowaniem struktury. Nie usuwaj plików, których nie ma w ZIP-ie.
2. Wgraj zmienione `client.js`, `mal.js` (zmiana numeru w nagłówku), `meta.json`, projekt csproj i dodatkowy test.
3. Zbuduj w GitHub Actions bez modyfikowania `.github/workflows`.
4. Zainstaluj skompilowaną wtyczkę, zrestartuj Jellyfin, otwórz AnimePL `#/mixed` po pełnym odświeżeniu (`Ctrl+Shift+R`).
5. Sprawdź czy AnimePL wyświetla 602 pozycje (według wcześniejszego zrzutu), czy kafelki otwierają szczegóły i czy filmy/seriale działają jak wcześniej.
6. Jeśli nadal wystąpi `addScrollEventListener`, sprawdź bez MisioFlix oraz tymczasowo bez iniekcji pozostałych wtyczek JS; zapisz pierwszą pełną linię stack trace. Nie zmieniaj NFO ani ustawień biblioteki.

## Niepełne liczniki MAL

Ten ZIP NIE naprawia jeszcze odczytu liczników po stronie serwera. W archiwach aktualizacyjnych brakuje `src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixMalService.cs` i modelu `MalEntry`.

W `ReadAllAsync` sprawdź, czy zapytanie do MAL v2 pobiera `list_status{status,score,num_episodes_watched,num_times_rewatched}` wraz z paginacją. Sprawdź, czy `MalEntry` mapuje obie liczby bez podstawiania zer za brakujące wartości. Po zmianach zrestartuj wtyczkę i kliknij „Odśwież z MAL” dla wybranego anime. Nie wprowadzaj zmian liczników przez formularz, dopóki odczyt nie jest poprawny.

Prześlij wyłącznie źródło `MisioFlixMalService.cs` (i osobne modele, jeśli występują), bez tokenów, klient secret i prywatnej konfiguracji.
