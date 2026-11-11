# MisioFlix Native 0.4.24.0 — poprawka identyfikatora serwera w listach bibliotek

## Objaw na Jellyfin 12.4
- AnimePL otwierało się pod `#/mixed?topParentId=...&collectionType=mixed`.
- Filmy i seriale były kierowane przez v0.4.23 pod `#/list?parentId=...` i mogły zatrzymać się na pustym widoku z animacją ładowania.
- Poprzednia próba `#/movies` / `#/tv` powodowała React #130 w tej instalacji.

## Co poprawiono
- Adresy starszego natywnego widoku Jellyfin mają teraz **dwa** parametry: `#/list?parentId=<biblioteka>&serverId=<serwer>`; jest to format używany przez natywny `appRouter.getRouteUrl()` dla katalogów.
- `serverId` pozyskiwany jest z aktualnego ApiClient; przewidziano bezpieczne alternatywy: bieżący serwer ConnectionManager, parametr istniejącego linku albo natywny link Jellyfin.
- Jeśli nie uda się ustalić identyfikatora serwera, MisioFlix **nie** generuje niekompletnego `#/list` (pozostawia oryginalny link).
- Bezpieczna korekta zapisanych zakładek w ścisłym formacie `#/list?parentId=<GUID>` po załadowaniu Jellyfin. Pozostałe listy, np. według gatunków, nie są przechwytywane.
- Oryginalne `#/mixed` dla AnimePL nie ulega zmianie.
- Żadnych zmian w `details.js`, w odtwarzaczu, karuzelach, NFO, serwerowej bibliotece ani CSS.

## Testy
- 86 testów Python i 2 testy Node: zaliczone w środowisku źródłowym.
- Test Chromium: kliknięcie filmów → właściwe `parentId` i `serverId`; kliknięcie seriali → właściwe `parentId` i `serverId`; AnimePL → nietknięte `#/mixed`.
- Nie wykonano testu przeciwko rzeczywistemu NAS ani kompilacji DLL w GitHub Actions — to wymaga wdrożenia.

## Przypomnienie
Archiwum służy do zaktualizowania **źródeł GitHub**, a nie do bezpośredniej instalacji jako wtyczka w Jellyfin.
