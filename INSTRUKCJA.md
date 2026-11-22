# MisioFlix — flagi języków po lewej i trwały indeks audio / napisów

## Zmiany

- Ikony flag PL/EN są w **pionowej kolumnie po lewej stronie** plakatu,
  zaraz pod etykietą rodzaju i roku, bez nakładania się na oznaczenia łapek.
- Są mniejsze: 16 px na desktopie i 14 px na telefonie.
- Kółko = audio, romb = napisy, pięciokąt = audio + napisy.
- Jeśli **pojedyncza wersja pliku ma dokładnie jedną ścieżkę audio**,
  a jej realna biblioteka Jellyfina ma nazwę kończącą się `PL` albo `ENG`,
  MisioFlix uznaje ten język za język dźwięku (także przy błędnych metadanych
  pojedynczej ścieżki). Przy więcej niż jednej ścieżce audio odczytuje rzeczywiste
  języki z MediaStreams. Napisy zawsze pochodzą z MediaStreams, nie z nazwy biblioteki.
- Serial i sezon pokazują sumę języków znalezionych w odcinkach. Obecność
  flagi nie gwarantuje jej dla **każdego** odcinka.
- Zapis do trwałego indeksu JSON pod katalogiem danych Jellyfin:
  `misioflix/language-flags-index.json` (na NAS-ie, nie w przeglądarce).
  Nie są zapisywane ścieżki plików, tokeny ani dane kont.
- Każda karta jest sprawdzana na uprawnieniach użytkownika. Pozycję nieobecną
  w indeksie MisioFlix analizuje **raz na pierwszym wyświetleniu**. Zapisane pozycje
  nie są ponownie skanowane automatycznie.
- W `Kokpit → Wtyczki → MisioFlix — ustawienia` nowa rozwijana sekcja
  `Flagi PL / ENG — dźwięk i napisy`, z przyciskiem
  **Odśwież bazę języków audio i napisów**. Wyłącznie administrator może wymusić
  skan całej dostępnej biblioteki. Zapis następuje atomowo po pełnym skanie.
- Bez zmian w MAL, Simkl, NFO, odtwarzaczu, przyciskach i pozostałych karuzelach.
- **Bez zmian `.github` i mechanizmu numerowania wydań**. Następny wolny numer
  wybierze istniejący workflow publikacji.

## Wgrywanie TYLKO przez stronę GitHub (bez terminala)

1. Rozpakuj **łatkę ZIP** na komputerze. **Nie wgrywaj ZIP-a jako pliku**.
2. Otwórz repozytorium `kumblip/misioflix` na gałęzi `main`.
3. Wgraj pliki ze ścieżek w ZIP-ie do **identycznych ścieżek** na GitHubie:

```
src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs
src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs
src/Jellyfin.Plugin.MisioFlix/Web/configPage.html
src/Jellyfin.Plugin.MisioFlix/Web/language-flags.css
tests/current/test_language_flags_126.py
tests/current/test_language_flags_127.py
tests/current/test_proposal_sets_108.py
```

4. Dla istniejącego pliku otwórz odpowiedni folder, wybierz
   `Add file → Upload files`, prześlij plik i zatwierdź commit na `main`.
   Nowy plik `test_language_flags_127.py` trafi do `tests/current`.
5. Sprawdź w `Actions`, czy testy i build przeszły.
6. Uruchom *nowe* wydanie przez `Actions → MisioFlix - opublikuj wydanie dla
   Jellyfin → Run workflow → main → PUBLIKUJ` (nie `Re-run` starego commita).
7. Zainstaluj nową wersję w Jellyfin, zrestartuj Jellyfin, a potem wejdź
   w ustawienia MisioFlixa i kliknij **Odśwież bazę języków audio i napisów**.
   Skan całej biblioteki uruchamia się **tylko na żądanie**. Gdy się powiedzie,
   nowe kafelki korzystają już z trwałego indeksu.

**Wymaga:** istniejącego kodu poprzedniej łatki flag PL/EN, w tym
`language-flags.js`, `ScriptInjection.cs` i metody `api/language-flags`.
W tej poprawce tych niezmienionych plików nie trzeba wgrywać ponownie.

## Weryfikacja

- 539 testów Python oraz 60 skryptów Node: zaliczone w środowisku roboczym.
- `node --check` nowych skryptów oraz JavaScriptu strony konfiguracji: zaliczone.
- Podgląd Chromium: ikony na lewej krawędzi, pionowo, z szerokością SVG 16 px.
- **Nie przeprowadzono** kompilacji .NET 10 ani testu integracyjnego na Twoim NAS.
  Ostateczna weryfikacja nastąpi w GitHub Actions po wgraniu kodu.
