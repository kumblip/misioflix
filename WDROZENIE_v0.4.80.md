# Wdrożenie MisioFlix 0.4.80.0

1. Do repozytorium `kumblip/misioflix` załaduj zawartość **pełnej paczki GitHub** (nadpisz pliki bez ręcznego modyfikowania `.github/workflows`).
2. Poczekaj na ukończenie GitHub Actions i opublikowanie zgodnego pakietu w repozytorium Jellyfina. Zainstaluj z katalogu Jellyfina i zrestartuj jego serwer, jeśli wymaga tego instalacja.
3. Odśwież stronę Edge (`Ctrl+F5`).
4. Otwórz **sezon anime z kilkunastoma odcinkami**. Pasek `S01`, `S02`… musi być **nad pierwszym odcinkiem**, nie na samym dole. Sprawdź też normalny serial.
5. Przewiń listę odcinków w dół; po prawej na dole powinna pokazać się strzałka ↑. Kliknij ją i sprawdź powrót na górę.
6. Otwórz wyszukiwarkę anime, sprawdź napis `Pokaż osobno sezony/speciale/itd.`, przewiń wyniki i kliknij strzałkę ↑. Sprawdź analogicznie wyszukiwarkę filmów i seriali. Podczas otwartej wyszukiwarki nie powinno być drugiej strzałki w tle.
7. Sprawdź nawigację `Wstecz` i panel aktualizacji — te mechanizmy pozostawiono bez zmian.

Nie wgrywaj źródłowego GitHub ZIP jako pliku instalacyjnego w Jellyfinie. Pakiet DLL jest tworzony dopiero przez workflow GitHub Actions.
