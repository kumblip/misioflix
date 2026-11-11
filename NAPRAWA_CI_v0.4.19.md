# MisioFlix 0.4.19.0 — poprawka GitHub Actions (historyczne testy)

## Co było nie tak

`python3 -m unittest discover -s tests -p 'test_*.py'` uruchamiał wszystkie pliki `test_*.py` obecne w repozytorium, także zachowane z wersji v0.4.6–0.4.11. Starsze testy oczekują stałych wersji (`0.4.6.0`, `0.4.9.0`) i dawnych znaczników CSS, mimo że wersja obecna to `0.4.19.0`. Podobny problem mógł wystąpić z automatycznym uruchamianiem wszystkich `.cjs`.

## Zmiana

- `tools/run_tests.py` uruchamia wszystkie `test_*.py` i `.cjs` wyłącznie z `tests/current/`.
- `tests/current/` zawiera **8 aktualnych modułów testów Python oraz 2 aktualne skrypty Node**. Testy zachowują realne sprawdzanie kodu; nie są wyciszane.
- Dawne pliki `tests/test_v046.py`, `tests/test_v049.py` itd. mogą pozostać w GitHub jako historia. Nie musisz ich ręcznie usuwać.
- Oba workflow korzystają z tego samego skryptu. Kolejne wersje, nowe testy oraz nowe numery wydania **nie wymagają edycji plików `.github/workflows/*.yml`**: nowe aktualne testy dodawaj do `tests/current/`.
- `meta.json` pozostaje z wersją `0.4.19.0`. Kod aplikacji, HTML, CSS, JS, C#, Jellyfin i architektura wtyczki nie zostały zmienione.

## Instalacja przez stronę GitHub

1. Do repozytorium `kumblip/misioflix`, gałąź `main`, wgraj **zawartość** archiwum `MisioFlix_v0.4.19_Naprawa_CI_Zrodla.zip`, zachowując ścieżki `tools/run_tests.py` i `tests/current/...`. Nie wgrywaj pliku ZIP jako jednego pliku w repozytorium.
2. Oddzielnie wgraj **zawartość** `MisioFlix_v0.4.19_Naprawa_CI_Workflows.zip`: `.github/workflows/build.yml` oraz `.github/workflows/release.yml`. Te pliki nadpisz raz, przy obecnej naprawie.
3. Wejdź w GitHub → Actions → `MisioFlix — build dla Jellyfin 12.4`, uruchom build (lub poczekaj na automatyczny push do `main`). W logu powinno być `Active CI tests: 8 Python modules, 2 Node scripts`, następnie `PASS: 50 Python tests, 2 Node scripts` i etap kompilacji DLL.
4. Po zielonym buildzie uruchom `release.yml` wpisując `PUBLIKUJ`. Instaluj w Jellyfin dopiero archiwum `.zip` utworzone w Actions/Release, zawierające DLL i `meta.json`, NIE archiwum naprawy CI.

**Uwaga:** jeśli po podmianie nadal widzisz `Ran 133 tests`, działa stara wersja workflow lub rozpoczęto run na poprzednim commicie. Poprawny runner wyświetla `Active CI tests`.

## Weryfikacja lokalna

- Python: 50/50 OK.
- Node: 2/2 OK.
- Uruchomiono próbnie dodatkowy celowo niepoprawny test w głównym katalogu `tests/`: aktywny runner go pomijał, nadal 50/50 OK.
- Sprawdzono składnię YAML.
- Nie kompilowano DLL w tym środowisku (brak .NET SDK) ani nie testowano działania wtyczki na NAS.

## Komunikat o istniejącej wersji

`Wersja już istnieje; zachowano poprzednią datę publikacji` to wiadomość generowana przez `tools/update_manifest.py` przy ponownej próbie dodania **tej samej** wersji z **identycznym** checksumem. Nie jest przyczyną `AssertionError` w testach; nowego wydania nie nadpisuj, jeśli GitHub Release z tym tagiem już istnieje.
