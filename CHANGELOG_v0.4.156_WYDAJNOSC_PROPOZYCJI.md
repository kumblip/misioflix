# MisioFlix 0.4.156.0 — wydajność wczytywania propozycji

Baza: pełne źródła checkpointu 0.4.155.0. Projekt Jellyfin Offline Sync odłożony i niezależny.

## Zmiany
- Łączenie równoczesnych żądań kafelków z wielu karuzel według ID, także jeśli listy częściowo się pokrywają. Partie maksymalnie 25 identyfikatorów; maksymalnie dwa aktywne żądania na instancję strony Home.
- Zachowana kolejność wyników dla każdej karuzeli, pamięć podręczna 45 s / 500 pozycji, autoryzacja każdego pobrania, brak zapisywania odmów w cache. Reset generacji odrzuca stare dane i usuwa oczekujące zadania; błąd zapytania umożliwia ponowienie.
- Zdarzenie mal-cards-updated (zmiana dekoracji DOM) nie czyści już cache kafelków. Zmiana faktycznych danych MAL (mal-cache-changed), zmiana użytkownika, powrót do aplikacji i demontaż Home nadal go unieważniają.
- Serwer: jedno wyszukanie lokalnego BaseItem i jedno ustalenie członkostwa bibliotek na kafelek propozycji. To samo członkostwo jest przekazywane do klasyfikacji MAL/SIMKL. Wyłączony zbędny TotalRecordCount w zapytaniu o identyfikatory kafelków; dla liczników kolekcji wyłączono obrazy i UserData, zachowując świeżą liczbę i autoryzację.
- Bez zmian w filtrach stanów, pełnej puli losowania, 10/25 kafelkach, plakatach, CSS, integracjach, odtwarzaniu i diagnostyce.

## Weryfikacja
- python3 tools/sync_version.py
- node --check src/Jellyfin.Plugin.MisioFlix/Web/home.js
- python3 tools/run_tests.py: 621 testów Python, 81 skryptów Node.js PASS.
- Symulacja: 6 karuzel po 10 żądanych pozycji, 35 unikalnych ID, 2 zapytania zamiast 6 osobnych; limit 2 aktywnych, ponowienia, izolacja generacji i brak obcych ID. Nie jest to benchmark NAS.
- Brak .NET SDK w środowisku. Kompilacja, weryfikacja API Jellyfin 12.4 i pomiar czasu na NAS pozostają do wykonania. Brak gwarancji konkretnego przyspieszenia.

## Wdrożenie
Nadpisz pliki w repozytorium działającego 155. Nie usuwaj innych plików. Build → release → restart Jellyfina → Ctrl+F5. W razie regresji przywróć checkpoint 155; nie nakładaj 148.
