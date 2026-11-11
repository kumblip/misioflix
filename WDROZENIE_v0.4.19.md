# MisioFlix Native v0.4.19.0 — instrukcja aktualizacji

To **nakładka na istniejące repozytorium** `kumblip/misioflix`, NIE samodzielny ZIP do instalowania w Jellyfin. W ZIP-ie znajdują się pliki źródłowe i workflow, a nie skompilowana DLL.

## Jednorazowo dla 0.4.19

1. Zrób kopię obecnych plików repozytorium. Rozpakuj `MisioFlix_Native_v0.4.19_..._GitHub.zip`.
2. Wgraj i podmień ścieżki z ZIP-a w istniejącym repo GitHub, bez dodawania dodatkowego katalogu nadrzędnego; w szczególności: `meta.json`, `src/...`, `tests/...` i nowy `tools/sync_version.py`.
3. **Tylko raz:** podmień `.github/workflows/build.yml` i `.github/workflows/release.yml`. Jeśli GitHub wymaga osobnego wgrania ukrytego katalogu `.github`, zrób to przy tym wydaniu.
4. Commit do gałęzi `main` automatycznie uruchomi workflow build. Uruchom testy i kompilację, a po zielonym wyniku znajdź w Actions artefakt `MisioFlix_0.4.19.0_JF12.4`.
5. Dopiero po kontroli buildu uruchom `release.yml` z `PUBLIKUJ`. Wtyczkę do Jellyfin instaluj z opublikowanego artefaktu ZIP z DLL i `meta.json`, a nie z tego archiwum źródeł.
6. Zrestartuj Jellyfin, otwórz stronę ponownie i użyj `Ctrl+F5`.

## Od v0.4.20 i dalej

- Przy zwykłych aktualizacjach **nie ruszaj** obu plików `.github/workflows`. Nie trzeba zmieniać listy testów, nazwy ZIP, nazwy release ani wersji w workflow.
- Źródłem wersji jest **`meta.json`** (pole `version`: cztery liczby). `tools/sync_version.py` przepisuje wersję do `.csproj` automatycznie w GitHub Actions, a `tools/package.py` czyta ją z `meta.json`. `ScriptInjection.cs` bierze wersję do znaczników JS/CSS z DLL.
- Gdyby później potrzebna była zmiana **samego procesu CI**, pliki workflow oczywiście nadal będzie można zmienić — ale nie przy zwykłym podbijaniu wersji wtyczki.

## Test funkcjonalny na NAS-ie

1. Otwórz panel administratora i sprawdź, czy **MisioFlix** pojawia się w nawigacji obok innych stron konfiguracji wtyczek; jeśli nie, sprawdź sekcję Wtyczki → MisioFlix, odśwież i zanotuj błędy w Console.
2. Na karuzeli „Oglądaj dalej” kliknij **tytuł lub plakat** filmu i anime. Film ma uruchamiać film, anime konkretny odcinek — bez przechodzenia do szczegółów. Powinien używać zapisanej pozycji wznowienia.
3. Kliknij małe **i**. Ma otworzyć stronę główną serii, NIE sezon/odcinek; dla filmu — jego kartę szczegółów.
4. Kliknij **×**, potem **Pokaż ukryte**. Każdy ukryty kafelek ma „Przywróć” i „Usuń”. Przywrócenie powinno działać bez zmian postępu Jellyfin.
5. „Usuń” testuj najpierw na pozycji, której punkt wznowienia możesz utracić: po potwierdzeniu zapisany punkt wznowienia zostanie wyzerowany w Jellyfin, ale wideo pozostanie w bibliotece. Pojedyncza pozycja nie powinna natychmiast wrócić z NextUp.
6. Sprawdź, czy nadal działają video, wybór bibliotek, filtry wyszukiwarek, ramki oraz „Losuj” po wielokrotnym kliknięciu.

## Dane i ograniczenia

- Stan „Ukryj/Przywróć”: `misioflix/hidden-resume.json` pod katalogiem danych Jellyfin.
- Stan „Usuń”: `misioflix/removed-resume.json` pod katalogiem danych Jellyfin. Obie listy rozdzielone per użytkownik.
- NFO, biblioteki, pliki na NAS-ie i konta innych osób nie są usuwane.
- Natywny odtwarzacz Jellyfin 12 nie jest nadpisywany. Skrót „resume” bazuje na natywnym mechanizmie `shortcuts`; przy nieobsługiwanym wariancie UI zapasowym zachowaniem może być pokazanie szczegółów konkretnego filmu/odcinka. Weryfikuj rzeczywiste uruchomienie na NAS-ie.
- W razie błędu kompilacji prześlij log `GitHub Actions -> build -> Kompilacja DLL` — testy kodu JS/Python nie zastępują kompilacji C#.
