# MisioFlix Native v0.4.100.0 — wdrożenie (Jellyfin 12.4)

To wydanie jest **pełnymi źródłami GitHub**, a nie gotowym plikiem DLL. Jest bezpośrednią kontynuacją v0.4.99.0.

## Wgranie (jak w v0.4.99)

1. Otwórz `PELNE_WYDANIA/MisioFlix_Native_v0.4.100_GitHub_PELNE.zip` i przenieś jego **zawartość**, zachowując foldery, do głównego katalogu repozytorium `kumblip/misioflix` w gałęzi `main`. Zamiast pełnej paczki można przenieść zawartość `ROZNICE_WERSJI/MisioFlix_Native_v0.4.100_TYLKO_ZMIANY_OD_099.zip` na istniejące repozytorium v0.4.99.
2. Upewnij się, że `meta.json` na `main` zawiera `"version": "0.4.100.0"` oraz że `src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj` zawiera `<Version>0.4.100</Version>` i `<AssemblyVersion>0.4.100.0</AssemblyVersion>`.
3. Uruchom istniejący workflow **build** (bez zmian). Po zielonym wyniku uruchom **release** z potwierdzeniem `PUBLIKUJ`.
4. Sprawdź, czy nowy Release ma tag `v0.4.100.0`, a ZIP instalacyjny nazwę `MisioFlix_0.4.100.0_JF12.4.zip`. Dopiero po tym instaluj wtyczkę w Jellyfin i uruchom go ponownie.

Nie uruchamiaj `PRZYGOTUJ_V100.ps1`, `PRZYGOTUJ_V101.ps1` ani jakichkolwiek dawnych plików `apply_patch.py` — w tym wydaniu ich nie ma i nie są potrzebne.

## Zmiany i zgodność

Połączono w jednym wydaniu cache katalogu wyszukiwarki z usprawnieniami NFO, liczników BoxSet i wersjonowanych zasobów. Nie zmieniono działania ani plików MAL, Simkl, odtwarzania, Resume, plakatów, NFO na dysku oraz `.github/workflows`.

Katalog z pamięci może być przez krótki czas starszy od danych serwera (do odświeżenia w tle). Aby wymusić aktualność natychmiast, użyj „Odśwież dane”. Podczas testu na NAS sprawdź stan po ręcznym odświeżeniu oraz po zmianie uprawnień użytkownika.

## Testy

Zaktualizowane testy: `tests/current/search_catalog_cache_100.cjs`, `tests/current/test_safe_performance_100.py` oraz dostosowane testy numeru wersji/licznika. Oryginalny runner `tools/run_tests.py` pozostaje bez zmian.

Kompilacja .NET 10 i test zdalnego Jellyfina **nie były uruchamiane** w środowisku przygotowania archiwum; przeprowadza je GitHub Actions / użytkownik.
