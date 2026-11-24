# Wdrożenie 0.4.145.0

1. Rozpakuj ZIP do katalogu głównego repozytorium w wersji 0.4.144.0 i nadpisz pliki.
2. Commit, standardowy build i release z hasłem PUBLIKUJ. Nie modyfikuj workflow.
3. Zaktualizuj wtyczkę, zrestartuj Jellyfin, Ctrl+F5. Pierwszy odczyt katalogu odbuduje cache.
4. Otwórz wyszukiwarkę anime, przełącz PL / ENG / Wszystkie, bez innych filtrów. Powtórz z zaznaczeniem osobnych sezonów. Sprawdź zgodność z przypisanymi rolami bibliotek; jeśli PL nadal pusty, sprawdź rolę Anime PL w konfiguracji MisioFlix i czy zawiera sezony w Jellyfinie. Nie trzeba odświeżać indeksu języków ani wysyłać raportów diagnostycznych.

Rollback: powrót do kodu/wydania 0.4.144.0. Nie zmieniano bazy Jellyfin, NFO ani konfiguracji biblioteki.
