# MisioFlix v0.4.16.0 — instalacja i test

1. Rozpakuj ZIP do głównego katalogu repozytorium `kumblip/misioflix`, zachowując strukturę `.github/`, `src/`, `tests/`, `tools/` i nadpisując zgodne pliki.
2. Zatwierdź zmiany w `main`.
3. Wejdź w GitHub Actions → `build`. Wszystkie testy, w tym `node tests/search_relation_0416.cjs`, i kompilacja .NET powinny zakończyć się zielono.
4. Dopiero wtedy uruchom `release` z wartością `PUBLIKUJ`, aby opublikować `v0.4.16.0`.
5. W Jellyfin zainstaluj nową wersję z repozytorium wtyczek, a po przygotowaniu aktualizacji zrestartuj kontener Jellyfin. W przeglądarce użyj `Ctrl + Shift + R`.
6. Otwórz Wyszukiwarkę anime, wpisz tytuł Speciala istniejącego sezonu, a potem sprawdź:
   - bez opcji sezonów widzisz **jedną kartę całej serii**,
   - karta pokazuje liczbę sezonów i odcinków **serii nadrzędnej**,
   - po zaznaczeniu `Pokaż osobne sezony / Specials` widzisz również kartę konkretnej części,
   - po wyborze `Sezony / Specials` widzisz wyłącznie osobne części,
   - kliknięcie karty serii i karty sezonu otwiera odpowiednie natywne szczegóły Jellyfin.
7. Otwórz Wyszukiwarkę filmów i seriali, rozwiń gatunki i potwierdź, że są to rzeczywiste gatunki Twoich filmów i seriali, a nie lista 52 gatunków anime.

Jeśli sezon nie ma powiązania `SeriesId`/`ParentId` albo jego NFO nie ma szukanego tytułu, nie zostanie automatycznie przypisany do rodzica. To działanie celowe, zapobiegające błędnym scaleniom.
