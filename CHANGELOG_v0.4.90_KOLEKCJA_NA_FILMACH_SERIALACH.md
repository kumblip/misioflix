# MisioFlix v0.4.90.0 — przynależność do kolekcji na filmach i serialach

- Mała ciemna ramka `3 📦` pod istniejącymi łapkami w prawym górnym rogu kafelków Movie/Series w domowych karuzelach i natywnych bibliotekach.
- Źródło prawdy: użytkownik i `ICollectionManager.GetCollectionsContainingItem` Jellyfina; liczba to `TotalRecordCount` pozycji w wybranej kolekcji. Nie wyprowadzamy jej z tytułu ani TMDb.
- Gdy film/serial należy do wielu kolekcji, pokazywany jest licznik pierwszej alfabetycznie kolekcji; nazwa kolekcji jest w tytule znacznika.
- Osobne endpointy półek i metadanych kart zachowują niewielkie, ograniczone wyniki; cache liczników wygasa po 3 minutach, z rozdzieleniem per użytkownik.
- Bez ingerencji w strukturę natywnych kart React, MAL, Simkl, animacje karuzel, infinite scroll czy działające wyszukiwarki.
- Dodano `Jellyfin_Wlasny_CSS.txt` — sam CSS wynikający z dotychczas uzgodnionych ustawień. Pełny indywidualny CSS Jellyfina nie był przekazany, dlatego ten plik nie może być uznany za kompletny eksport.
- Zachowano `zrobionepozamisioflixem.txt` jako dokument zmian poza wtyczką.
- Do testu na działającej instalacji: sprawdzenie uprawnień i liczby członków BoxSetów na filmach/serialach, w tym tytułów należących do kilku kolekcji.
