# MisioFlix Native v0.4.74.0 — wdrożenie

1. **Pełna paczka**: wypakuj `MisioFlix_Native_v0.4.74_GitHub_PELNE.zip` do katalogu głównego repozytorium `kumblip/misioflix` (bez dodatkowego podfolderu) i zastąp starsze źródła.
2. **Tylko poprawka**: jeśli repozytorium ma dokładnie v0.4.73.0, wypakuj zamiast tego `MisioFlix_Native_v0.4.74_TYLKO_ZMIANY.zip` i nadpisz odpowiednie pliki.
3. Zatwierdź zmiany. Dotychczasowe GitHub Actions (`tools/sync_version.py`) pobiera numer `0.4.74.0` z `meta.json`.
4. Zainstaluj skompilowaną wersję w Jellyfin 12.4 i zrestartuj instancję.
5. W wyszukiwarce anime zaznacz „Pokaż osobne części anime”, wpisz `arifureta` i sprawdź: czerwone łapki `01`–`05` nad niebieskimi licznikami odcinków; w podpowiedziach poprawne numery `Season XX`, typy NFO, lata i odcinki. Przy wyłączonej opcji nadrzędna karta ma nadal złotą łapkę `5`.

**To źródła, a nie gotowa DLL.** Plików `season.nfo` z NAS nie dodawaj do repozytorium; są czytane lokalnie przez wtyczkę.
