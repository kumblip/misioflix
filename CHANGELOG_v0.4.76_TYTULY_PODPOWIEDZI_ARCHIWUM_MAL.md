# MisioFlix Native v0.4.76.0 — pełne tytuły, 18 podpowiedzi, offline MAL

Podstawa: **v0.4.75.0**. Aktualizacja nie modyfikuje plików multimedialnych, NFO, stanów oglądania ani synchronizacji MAL/Simkl. Aktualizowane są wyłącznie widoki i bezpieczny odczyt kopii MAL.

## Pełne nazwy w widoku szczegółów

- Tytuły `h1` i `.itemName` zawijają się na wiele wierszy zamiast `...`.
- Zachowany oryginalny tytuł Jellyfin, metadane, przyciski i natywny odtwarzacz.
- Stylowanie tylko w `#itemDetailPage.mf-detail-compact`, także na mniejszych ekranach.

## Podpowiedzi w obu wyszukiwarkach

- Limit podpowiedzi po wpisaniu fragmentu tytułu zwiększono **8 → 18** (+10).
- Rozwijana lista przewijana, z maksymalną wysokością adaptowaną do ekranu.
- Dopasowanie nadal po tytułach (anime: także warianty z NFO i powiązane sezony), nie po opisach.
- Limit kart wyników i przycisk „Pokaż kolejne” bez zmian.

## Filtr „Obejrzane” — źródła dla każdego użytkownika Jellyfin

1. Połączony MAL: odczyt `/MisioFlix/api/mal/status?refresh=false`.
2. Gdy MAL odłączony lub niedostępny: uwierzytelniony GET `/MisioFlix/api/mal/archive/watch-status`, odczyt z `current.json` na NAS-ie.
3. Bez dostępnej, jednoznacznej kopii MAL: stany UserData Jellyfin z jawną informacją w wyszukiwarce.

Archiwum połączone jest z identyfikatorem użytkownika **Jellyfin** oraz identyfikatorem konta **MAL**. Po odłączeniu konta odczyt możliwy tylko, jeżeli w folderze tego konkretnego użytkownika istnieje dokładnie **jedna** historyczna tożsamość MAL. Jeżeli kont było więcej, nie wybieramy arbitralnego archiwum. Zapisane `state.json` oraz `current.json` muszą potwierdzać tę samą tożsamość, a `itemCount` zgodny z liczbą pozycji. Ponowne podłączenie innego MAL nie pozwoli odczytać starej kopii.

Odpowiedź zawiera tylko identyfikatory anime i statusy, bez notatek, tokenów czy danych innego użytkownika. Brak jakiejkolwiek operacji zapisu do MAL. Kopie dzienne/miesięczne, harmonogram i edytor MAL pozostają bez zmian.

## Weryfikacja

- `python tools/run_tests.py` — **361/361 Python**, **27/27 skryptów Node.js**.
- `node --check` — poprawna składnia `home.js` i `details.js`.
- Brak środowiska `dotnet` w tym uruchomieniu: nie wykonywano kompilacji DLL ani testów end-to-end na NAS-ie.
