# MisioFlix — GitHub Releases i własne repozytorium Jellyfin

## Co zawiera paczka

Cztery pliki do **głównego katalogu** repozytorium `https://github.com/kumblip/misioflix`:

- `.github/workflows/release.yml` — publikowanie GitHub Release *po ręcznym zatwierdzeniu*.
- `tools/package.py` — zamienia istniejący skrypt pakowania na nowy: DLL i `meta.json` u podstawy ZIP, bez dodatkowego folderu; dołącza MD5 i SHA-256.
- `tools/update_manifest.py` — aktualizuje manifest na podstawie zbudowanej paczki; zachowuje historię wersji.
- `manifest.json` — początkowo pusta tablica `[]`, ponieważ brak jeszcze opublikowanego wydania. Zapełni się automatycznie po publikacji.

Nie usuwaj istniejącego `.github/workflows/build.yml`: służy do testów każdej zmiany. `release.yml` służy tylko do wydań.

## Pierwsza instalacja plików

Na GitHub wybierz **Code → Add file → Upload files** i przeciągnij **zawartość** rozpakowanej paczki, zachowując foldery.
W razie niewidocznego katalogu `.github` użyj **Add file → Create new file** i wpisz dokładnie `.github/workflows/release.yml`, następnie wklej zawartość pliku. Tak samo możesz dodać `tools/update_manifest.py`, a `tools/package.py` nadpisać przez edycję.

**Uwaga:** GitHub nie zaakceptuje jednej paczki ZIP jako rozwiniętego kodu. Trzeba przesłać pliki z rozpakowanego archiwum. Po zatwierdzeniu commit uruchomi zwykły `build.yml`.

## Pierwsze wydanie — dopiero po ocenie bezpieczeństwa wtyczki

1. Sprawdź najpierw za pomocą dotychczasowego workflow, że kod i ZIP poprawnie się budują.
2. Dopóki wtyczka nie była sprawdzona na testowym Jellyfin, traktuj ją jako wersję eksperymentalną.
3. Wejdź w **Actions → MisioFlix - opublikuj wydanie dla Jellyfin → Run workflow**.
4. W polu zatwierdzenia wpisz dosłownie `PUBLIKUJ` i wybierz gałąź `main`.
5. Workflow przeprowadzi testy, skompiluje DLL, utworzy spłaszczony ZIP, wygeneruje MD5 i SHA-256, utworzy GitHub Release `v0.4.0.0` i zapisze `manifest.json` na `main`.
6. Sprawdź `https://github.com/kumblip/misioflix/releases` i otwórz manifest: `https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json`.

Jeżeli repozytorium wymusza ochronę gałęzi albo Github Actions nie ma pozwolenia **Read and write permissions**, publikacja manifestu może się nie udać. Wtedy sprawdź ustawienia w **Settings → Actions → General → Workflow permissions**. Nie używaj tokenów osobistych ani `force push`.

## Dodanie do Jellyfin po publikacji

1. Jellyfin `http://kumadlaneko:8096` → Panel administratora → Wtyczki → Repozytoria → Dodaj.
2. Nazwa: `MisioFlix`.
3. URL: `https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json`.
4. W katalogu wtyczek odśwież i wybierz MisioFlix, **jeśli wersja jest dostępna i zgodna z serwerem**.
5. Po instalacji restart Jellyfin; sprawdź logi i `/MisioFlix/api/health`.

## Zasady aktualizacji

- Nowy kod -> commit -> testy w `build.yml`.
- Publikacja nie zachodzi po każdym commicie. **Ręcznie uruchamiasz release.yml** po weryfikacji.
- Każde kolejne wydanie musi mieć wyższy numer w `meta.json` **i** w `<Version>` wewnątrz `.csproj`, np. `0.4.1.0` oraz `0.4.1`; nie publikuj innego ZIP pod tą samą wersją.
- `checksum` w manifeście Jellyfin to **MD5 ZIP**, a nie SHA-256. Dodatkowo w Releases jest plik `.sha256`.
- `manifest.json` zachowuje wersje historyczne. Wtyczki nie aktualizują się na NAS od samego nowego commita: Jellyfin musi pobrać i zastosować wydanie.

**Status:** przygotowano tylko system publikacji; nie stworzono jeszcze Release ani nie zainstalowano DLL w Jellyfin. Udana kompilacja nie jest równoznaczna z testem działania wtyczki na Twoim serwerze.
