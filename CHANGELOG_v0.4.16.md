# MisioFlix Native 0.4.16.0 — wyszukiwanie całych serii anime po tytułach sezonów

## Anime

- Wyszukiwarka przeszukuje nazwy i alternatywne tytuły w NFO zarówno głównej serii, jak i jej sezonów/Speciali.
- Domyślnie pokazuje jedną kartę **nadrzędnej serii**, także wtedy, kiedy wpisano tylko tytuł jej Speciala.
- Sezony są łączone z serialem wyłącznie przez identyfikator `SeriesId` / `ParentId` Jellyfin. Nigdy przez zgadywanie na podstawie tytułu.
- Karta całej serii wyświetla liczniki sezonów i odcinków pochodzące z głównej serii Jellyfin, nie z pojedynczego sezonu. Jeśli brak liczników, dopuszczamy tylko ostrożne wyliczenie z dostępnych połączonych sezonów.
- Włączanie `Pokaż osobne sezony / Specials` nadal pozwala otwierać konkretne części; filtr `Sezony / Specials` pokazuje tylko je.
- Pozostaje dokładnie 52 gatunków dozwolonych w anime, trójstanowe filtry, NFO bez metadanych zastępczych Jellyfin.
- Wykluczone jest omyłkowe łączenie różnych serii o takich samych nazwach.

## Filmy i seriale

- Druga wyszukiwarka pozostaje niezależna i pokazuje tylko gatunki rzeczywiście przypisane przez Jellyfin do filmów i seriali spoza anime. Nie korzysta z listy 52 gatunków anime.
- Opcja `Wszystkie typy / Serie / Filmy` zostaje zachowana.

## Jakość

- Dodano `tests/search_relation_0416.cjs` do build i release GitHub Actions. Test sprawdza dopasowanie tytułu Speciala do serii, liczników łącznych, niełączenie obcych serii i filtry gatunków nie-anime.
- Bez dodatkowego katalogu na stronie głównej, bez zmiany odtwarzacza i bez nowego kontenera.
- Test w prawdziwym Jellyfin na NAS wymaga potwierdzenia po publikacji.
