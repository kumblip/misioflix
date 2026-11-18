# Naprawa publikacji MisioFlix v0.4.100.0 (Search Cache)

## Dlaczego GitHub Actions zwraca `Wydanie v0.4.99.0 już istnieje`

To nie jest błąd kompilacji kodu. `.github/workflows/release.yml` czyta wersję z `meta.json`, kompiluje i pakuje DLL, a dopiero później sprawdza tag GitHub Release. Jeśli na gałęzi `main` nadal jest `0.4.99.0`, zawsze otrzyma tag `v0.4.99.0` i odmówi nadpisania istniejącego wydania. Przesłanie samego ZIP-a z poprawką v100 do repozytorium **nie aplikuje kodu** ani nie zmienia `meta.json`.

Ta paczka naprawia proces **przygotowania i wgrania źródeł v0.4.100.0**. Nie zmienia workflow publikacji `release.yml`, aktualnego wydania v0.4.99.0 ani zainstalowanej wtyczki.

## Zalecana metoda na Windows

Wypakuj cały ZIP do osobnego katalogu. W PowerShell uruchom:

```powershell
powershell -ExecutionPolicy Bypass -File .\NAPRAW_V100_WINDOWS.ps1 -WyslijNaGitHub
```

Do testu **bez wysyłania** czegokolwiek na GitHub:

```powershell
powershell -ExecutionPolicy Bypass -File .\NAPRAW_V100_WINDOWS.ps1
```

Możesz dodać `-Kompiluj`, jeśli masz .NET 10 SDK. Do zwykłej procedury wymagane są Git for Windows z uwierzytelnieniem do `kumblip/misioflix`, Python 3, Node.js i npm. Skrypt sam przygotowuje nowy katalog `MISIOFLIX_V100_POPRAWIONE_ZRODLA`, więc ponowne uruchomienie w tym samym folderze jest blokowane (zabezpieczenie przed nadpisaniem).

Skrypt:
1. Pobiera **świeżą gałąź main** do osobnego katalogu, nie miesza z wcześniejszymi źródłami ani z plikami użytkownika.
2. Przerywa, jeżeli tag `v0.4.100.0` już istnieje albo baza nie jest `0.4.99.0` / częściowo przygotowaną `0.4.100.0`.
3. Gdy Search Cache nie ma w `home.js`, nakłada oryginalną poprawkę. Gdy poprawka jest już w całości, tylko naprawia metadane wersji i uzupełnia pliki testów.
4. Ustawia `meta.json = 0.4.100.0` i synchronizuje `csproj` przez oryginalny `tools/sync_version.py`.
5. Uruchamia kontrolę składni JS, wszystkie aktywne testy projektu i opcjonalnie lokalną kompilację .NET 10.
6. Koryguje tylko wybór testów w `.github/workflows/build.yml`, jeżeli workflow nadal uruchamia historyczne testy z katalogu `tests/`. Używa tego samego `tools/run_tests.py`, co workflow wydania, bez usuwania testów z repozytorium.
7. Przy `-WyslijNaGitHub` zatwierdza **tylko** konkretne pliki poprawki i robi zwykły `git push origin HEAD:main` (bez force-push). Jeśli GitHub zmienił się od klonowania, push zostanie odrzucony bez nadpisywania.

## Po wysłaniu

1. Otwórz `https://github.com/kumblip/misioflix/blob/main/meta.json` i sprawdź `"version": "0.4.100.0"`.
2. Otwórz GitHub **Actions**, poczekaj na zielony workflow `build` (testy i kompilacja).
3. Dopiero potem uruchom ręczny workflow `MisioFlix - opublikuj wydanie dla Jellyfin` z polem `PUBLIKUJ`.
4. Wydanie powinno mieć tag **`v0.4.100.0`**, nie `v0.4.99.0`.

**Nie usuwaj i nie nadpisuj v0.4.99.0. Nie zmieniaj tylko nazwy paczki ZIP.** Zmienia się numer w metadanych i kompilowanej DLL, a Search Cache musi realnie znajdować się w `home.js`.

## Wariant ręczny, jeżeli źródła Search Cache są już na GitHub

W repozytorium na `main` upewnij się, że `home.js` zawiera komplet `SEARCH_CATALOG_DB`, `catalogScope()`, `readCatalogSnapshot()`, `getCatalogForSearch()` i `refreshScopedCatalog()`. **Jeśli kodu nie ma, sama zmiana numeru jest błędem i nie dostarcza żadnego przyspieszenia.** Skrypt robi to sprawdzenie automatycznie.

## Zakres i bezpieczeństwo

Naprawa modyfikuje wyłącznie `Web/home.js`, `meta.json`, synchronizowaną wersję w `.csproj`, changelog i testy Search Cache oraz wybór aktualnych testów w `build.yml`. Nie edytuje MAL, Simkl, kolekcji, interfejsu, odtwarzacza, Resume, NFO, katalogów NAS, ani `manifest.json`. Nie wyłącza blokady istniejących wydań w workflow; prawidłowo pozostaje ona aktywna.

**Ograniczenia kontroli**: poprawność procesu i skryptów sprawdzono lokalnie na odtworzonym wariancie źródeł v0.4.94 używanym do testów. Nie wykonano kompilacji .NET ani testów na rzeczywistym NAS; ostateczne testy na aktualnym `main` wykonują się dopiero na komputerze użytkownika / w GitHub Actions.

Nie przechodzi to automatycznie do v0.4.101.0 (szersza optymalizacja) — ta ma osobną paczkę. Tu naprawiany jest **wyłącznie błąd publikacji v0.4.100.0**.
