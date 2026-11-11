# MisioFlix v0.4.30 — jednorazowa naprawa testów CI

## Problem
GitHub Actions uruchamia poprawnie aktywne testy, ale dwa dawne moduły porównują `meta.json` i `AssemblyVersion` ze stałą `0.4.29.0`. Nowy test MAL ma tę samą pułapkę dla `0.4.30.0` i zablokowałby następną wersję.

## Co nadpisać w GitHub
Rozpakuj archiwum i wgraj **wyłącznie** te trzy pliki do dokładnie tych ścieżek (pozostaw resztę repozytorium bez zmian):

- `tests/current/test_banner_library_nav_0429.py`
- `tests/current/test_collections_directory_0428.py`
- `tests/current/test_mal_0430.py`

Nie zmieniaj `meta.json` (pozostaje `0.4.30.0`), `.github/workflows/build.yml`, `.github/workflows/release.yml`, kodu MAL, NFO ani ustawień użytkowników. Nie kasuj innych testów.

## Zasada na przyszłość
Testy odczytują numer kompilacji z `meta.json`, sprawdzają jego czteroczłonową postać, minimalną wersję wprowadzenia funkcji i zgodność z `AssemblyVersion` oraz `FileVersion` w projekcie `.csproj`. Nie są przywiązane do numeru konkretnego wydania. `tools/sync_version.py` już synchronizuje projekt w CI.

Przy pisaniu nowych testów nie zapisuj stałego numeru aktualnej wersji jako jedynej akceptowanej. Zamiast tego porównuj wersję z `meta.json` z `csproj` oraz, jeśli trzeba, z wersją minimalną wymaganej funkcji.

## Kontrola
Odtworzono 127 testów i dwa niepowodzenia. Po poprawce: 127/127 Python, 2/2 Node. Symulowany bump do `0.4.31.0` również przeszedł (127/127 i 2/2), a po teście przywrócono `0.4.30.0`.

Po podmianie uruchom ponownie **Build** w GitHub Actions. Wynik na NAS-ie i zdalne GitHub Actions nie zostały jeszcze sprawdzone.
