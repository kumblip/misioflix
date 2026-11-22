# MisioFlix — oznaczenia języków na kartach

**Źródło:** dostarczona wersja MisioFlixa 0.4.121.0 z wcześniej przygotowaną poprawką układu banera i naprawą testów CI. Ta łatka **nie zmienia wersji ręcznie i nie zawiera folderu `.github`**.

## Co robi łatka

- Polska flaga `PL` i brytyjska flaga `EN` na istniejących kafelkach w karuzelach, bibliotekach, na kartach sezonów i odcinków, również w „Oglądaj dalej”.
- **Kółko** = audio, **romb** = napisy, **pięciokąt** = audio i napisy.
- Dla pojedynczego filmu/odcinka sprawdza faktyczne ścieżki audio i napisy z Jellyfina; uwzględnia dostępne, a nie aktualnie wybrane ścieżki.
- Dla sezonu i serialu łączy informacje z rzeczywistych odcinków: flaga oznacza, że dana ścieżka występuje **w co najmniej jednym odcinku**, niekoniecznie wszystkich.
- Nie odgaduje języka z nazwy biblioteki, ścieżki folderu, nazwy pliku ani samego typu anime.
- Jeśli brak informacji o języku, nie wyświetla żadnej flagi; nie zastępuje odtwarzacza i nie zapisuje metadanych.
- Ładuje dane dla widocznych kart, ma krótkotrwały cache po stronie serwera, weryfikuje dostęp użytkownika.

## Wgrywanie — tylko przez WWW GitHuba

Rozpakuj ZIP. **Nie wgrywaj samego ZIP-a do repozytorium.** W `kumblip/misioflix` na gałęzi `main` przejdź do folderu i wybierz `Add file → Upload files`, a następnie zatwierdź zmianę przez `Commit changes`.

1. Folder `src/Jellyfin.Plugin.MisioFlix/Web/`: wgraj `language-flags.js` i `language-flags.css` (nowe pliki), a także zastąp `home.js` (pozwala rozpoznać dokładny odcinek w „Oglądaj dalej”).
2. Folder `src/Jellyfin.Plugin.MisioFlix/Services/`: zastąp `MisioFlixCatalogService.cs` oraz `ScriptInjection.cs`.
3. Folder `src/Jellyfin.Plugin.MisioFlix/Controllers/`: zastąp `MisioFlixController.cs`.
4. Folder `tests/current/`: wgraj `test_language_flags_126.py` (nowy test).

Plik `INSTRUKCJA.md` jest tylko dla Ciebie — nie trzeba go dodawać do repozytorium. Nie ruszaj `.github`, `meta.json`, `manifest.json` ani plików `.csproj`.

Po wgraniu: `Actions → MisioFlix — build dla Jellyfin 12.4`; sprawdź kompilację .NET i testy. Osobne wydanie publikuje dotychczasowy `release.yml` po uruchomieniu `Run workflow → PUBLIKUJ`. Numer zostanie wybrany automatycznie przez dotychczasowy skrypt.

## Weryfikacja lokalna

- `node --check language-flags.js` — OK.
- W dotychczasowym projekcie 534 testy Python i 60 skryptów Node — OK.
- Przeglądarka Chromium z przykładową odpowiedzią API: oba rodzaje kart otrzymują odpowiednie flagi i kształty.
- **Uwaga:** w tym środowisku nie ma SDK .NET 10; kompilacja C# i działanie na rzeczywistym serwerze Jellyfin wymagają sprawdzenia w GitHub Actions i wtyczce. Przed finalną publikacją sprawdź nowy build.
