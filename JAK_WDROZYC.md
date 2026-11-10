# MisioFlix 0.4.1 — poprawki wyglądu

Ten ZIP jest **łatką do repozytorium** `kumblip/misioflix`, a NIE archiwum instalacyjnym Jellyfin. Nie instaluj go w panelu wtyczek.

## Zmiany

- Tytuł karty ma maksymalnie 2 linie. Pełny tytuł jest w atrybucie `title` i w widoku szczegółów.
- Na każdej karcie widać maksymalnie 3 gatunki o najwyższej częstotliwości wśród dostępnych użytkownikowi produkcji (oddzielne rankingi anime NFO oraz pozostałych gatunków Jellyfin); pozostałe gatunki nadal dostępne w szczegółach i wyszukiwarkach.
- Tekst opisu pozostał identyczny, z tym samym ograniczeniem wizualnym do 4 linijek na karcie; cały opis jest w szczegółach.
- Plakaty są nieco mniejsze, ale zachowują proporcje 2:3.
- Górna plansza jest znacznie niższa. Ma sekcję **Oglądaj dalej** z maksymalnie trzema ostatnimi przerwanymi pozycjami i paskami postępu.
- Resume pobierane jest z wbudowanego API Jellyfin, tylko dla zalogowanego użytkownika. Dla anime tekst wyświetlanej pozycji nadal pochodzi z lokalnego NFO; Jellyfin dostarcza tylko identyfikator i postęp odtwarzania. Kliknięcie pozycji przekazuje użytkownika do oryginalnej strony Jellyfin z odtwarzaczem.

## Wgranie na GitHub

1. Rozpakuj ZIP na komputerze.
2. Otwórz repozytorium https://github.com/kumblip/misioflix i zastąp wskazane pliki, zachowując identyczne ścieżki.
3. Zwróć uwagę na katalog `src/Jellyfin.Plugin.MisioFlix` i `meta.json` w głównym katalogu repozytorium.
4. Zapisz commit, uruchom dotychczasowy workflow **build** w GitHub Actions. Nie publikuj, jeśli kompilacja lub testy są czerwone.
5. Po zielonym wyniku uruchom **release** i wpisz `PUBLIKUJ`. Powinien powstać ZIP `MisioFlix_0.4.1.0_JF12.4.zip` oraz nowy wpis w `manifest.json`.
6. W Jellyfin zainstaluj aktualizację MisioFlix i uruchom ponownie **wyłącznie** kontener Jellyfin. Przed aktualizacją zachowaj kopię konfiguracji.

Łatka aktualizuje także `.github/workflows/build.yml` (wersjo-niezależna ścieżka ZIP) oraz `Services/ScriptInjection.cs` (nowe adresy CSS/JS z numerem wersji, żeby przeglądarka nie trzymała starego interfejsu). W repozytorium wciąż zostają obecne `tools`, `manifest.json`, `.github/workflows/release.yml` i reszta projektu — niczego z nich nie usuwaj. Po wymianie plików upewnij się, że nie dodałeś dodatkowego folderu nadrzędnego.

## Ograniczenia

- Nie testowano tej wersji na rzeczywistym NAS użytkownika.
- `Oglądaj dalej` pokazuje pozycje ze wznowieniem (film/odcinek), nie automatycznie wszystkie następne nieobejrzane odcinki serii. Korzysta z Jellyfin Resume.
- Bezpośrednie otwieranie odtwarzacza nadal wykorzystuje istniejącą funkcję `openNative` ze starszej wersji; wymaga osobnego testu z rzeczywistym odcinkiem/filmem.
- Zmiany nie zastępują domyślnego widoku Jellyfin poza portalem misioflix.
- CSS/JS może wymagać poprawek po przyszłych zmianach Jellyfin Web.
