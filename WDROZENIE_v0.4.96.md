# Wdrożenie v0.4.96 — kolekcje NFO

1. Przed instalacją wykonaj kopię **danych Jellyfina, w tym kolekcji i bazy**. Nie wystarczy backup samych NFO.
2. Do repozytorium GitHub wgraj pliki z pełnej paczki źródłowej albo ZIP różnicowy względem v0.4.95. Weryfikuj zielony build .NET 10 / Jellyfin.Controller 12.4.0.
3. Zainstaluj nową wtyczkę Jellyfin i zrestartuj serwer zgodnie z procedurą instalacyjną.
4. W panelu MisioFlix uruchom `Synchronizuj kolekcje z NFO teraz`. Porównaj wynik: nowe kolekcje, dodane pozycje, usunięte powiązania, usunięte kolekcje, kolejność. Początkowy skan nie powinien usunąć ręcznie utworzonych BoxSetów.
5. Test kontrolowany: w jednym `movie.nfo` umieść dwa `<set>` i dwa `<sorttitle>`. Sprawdź dwie kolekcje oraz ich kolejność. Usuń jeden `<set>` i jedną odpowiadającą mu wartość `<sorttitle>`, uruchom ponownie synchronizację. Film powinien zniknąć z jednej kolekcji, lecz pozostać w drugiej.
6. Usuń ostatni tag w kolekcji stworzonej przez nową wersję. Powinna zniknąć **sama pusta kolekcja**, nie film, jego katalog czy NFO.
7. Sprawdź zabezpieczenie: uszkodź testowy NFO (nie na bibliotece produkcyjnej) lub odmontuj testowy dysk. Przy takim skanie nie powinny nastąpić żadne operacje usuwania.
8. Rejestr: `<Jellyfin DataPath>/misioflix/collections/nfo-collections-state.json`. **Nie usuwaj ani nie edytuj** w trakcie pracy. Utrata rejestru oznacza utratę historii własności (bezpiecznik blokuje niektóre usunięcia).

**Uwaga:** samym statycznym testem nie da się zagwarantować działania sortowania po zapisie `LinkedChildren` w konkretnym buildzie Jellyfin. Wymagany test integracyjny na NAS-ie.
