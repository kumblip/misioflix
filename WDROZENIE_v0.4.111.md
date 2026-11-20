# Wdrożenie MisioFlix v0.4.111.0

Podstawa: **scalone źródła v0.4.110.0**. Nie stosuj tego patcha na oddzielnym, dawnym v0.4.110 ani na niescalonej v0.4.111.

1. Pobierz **MisioFlix_Native_v0.4.111_TYLKO_ZMIANY_OD_110_SCALONE.zip**, rozpakuj pliki w katalogu repozytorium na bazie scalonego v0.4.110.
2. Uruchom istniejący GitHub Actions `build`; po jego sukcesie istniejący `release` z tagiem **`v0.4.111.0`**.
3. Zaktualizuj wtyczkę w Jellyfinie i uruchom ponownie Jellyfin.
4. Wejdź na stronę główną. Pozycja **„Ukryj propozycje”** powinna być włączona, a **„Pokaż biblioteki”** nadal wyłączona.
5. Na przykładowym kafelku propozycji i na kafelku wyszukiwarki kliknij „i” po prawej stronie tytułu. Sprawdź pełną nazwę, wszystkie gatunki, pełny opis oraz działania „Zamknij” i „Otwórz”.

**Bez zmian w plikach Jellyfin Web, NFO, MAL i Simkl.**

Jeżeli pojawi się nowy błąd instalacji lub kompilacji, użyj oryginalnego komunikatu GitHub Actions/Jellyfin; testy źródeł nie zastępują sprawdzenia na NAS.
