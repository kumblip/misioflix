# MisioFlix 0.4.140.0 — testowe usprawnienia wydajności

**Baza:** potwierdzony przez użytkownika checkpoint STABLE `0.4.139.0` z 23.11.2026. **Status tego wydania:** do przetestowania na NAS-ie, nie zastępuje checkpointu.

## Zmiany

1. **Propozycje — krótkotrwały cache kart** (`Web/home.js`). Odpowiedzi z autoryzowanego `/home/recommendation-cards` są ponownie wykorzystywane w bieżącym montażu strony głównej przez maksymalnie 45 sekund (limit 500 pozycji). Nieznane/niedostępne identyfikatory nie są zapamiętywane; brak zapisu do localStorage/IndexedDB. Cache jest czyszczony po opuszczeniu Home, zmianie użytkownika, powrocie karty na pierwszy plan oraz po odpowiednich sygnałach MAL. Gatunki i gatunki dziedziczone z sezonów są normalizowane raz po pobraniu katalogu, nie dla każdej kombinacji filtrów.
2. **Biblioteki — zbiorcze pobieranie pierwszych stron** (`Web/home.js`, `MisioFlixController.cs`, `MisioFlixCatalogService.cs`). Nowe `GET /MisioFlix/api/home/shelves?ids=<guid,...>` obsługuje maksymalnie 12 bibliotek w jednym żądaniu, dla trybu „Ostatnio dodane”, pierwszych 10 kart. Serwer **za każdym razem** uwierzytelnia żądanie i odczytuje dostępne `Users/<id>/Views`; nie współdzieli uprawnień między sesjami i nie ujawnia niedostępnych bibliotek. Do trzech równoczesnych zapytań o karty. Globalne kolekcje i stronicowanie/losowanie pozostają na dotychczasowych endpointach. Gdy zbiorcze pobranie zawiedzie lub pominie bibliotekę, zachowany jest wcześniejszy, jednostkowy odczyt.
3. **Odtwarzanie — jedna ścieżka natywna** (`Web/home.js`, `Web/details.js`). „Oglądaj dalej” i uruchamianie odcinka korzystają z `MisioFlixPlayItem`, który przechodzi do strony **dokładnego** filmu/odcinka i naciska rzeczywisty przycisk Jellyfina. Usunięto alternatywny klik przez ukryty proxy oraz związane z nim oczekiwanie do 2200 ms. Usunięto sztywny próg 750 ms; sprawdzanie gotowości przycisku odbywa się co 60 ms (maksymalnie 10 s w przypadku problemów). Ochrona przed błędnym odtworzeniem: nie klikamy natywnego przycisku przypisanego do poprzedniego tytułu ani niezweryfikowanego, ponownie używanego widoku SPA. Po błędzie pokazujemy komunikat, nie próbujemy drugiej metody uruchamiania.

## Nie zmieniono

- Oddzielnych bibliotek anime PL/ENG i filmów/seriali, rozdziału MAL vs SIMKL, źródeł NFO i indeksu języków.
- Wyglądu i kolorów przełączników z 0.4.139, kolejności stanów oraz natywnego odtwarzacza Jellyfina.
- Pierwszych 10 kart karuzeli, przyrostowych 25 i losowych 5 w dotychczasowych trybach.

## Kontrola

- `python3 tools/run_tests.py`: **589 testów Python i 69 skryptów Node.js — OK**; dodano scenariusze dynamiczne cache, batch i bezpieczeństwa odtwarzania.
- `node --check` dla `home.js` i `details.js`: OK.
- **Nie wykonano** kompilacji .NET 10 ani próby odtwarzania na prawdziwym Jellyfinie. GitHub Actions / NAS muszą to sprawdzić przed uznaniem wersji za stabilną.

## Plan testu i ewentualnego powrotu

1. Sprawdź GitHub Actions `build` i kompilację .NET 10, następnie wydanie i aktualizację DLL zgodnie z dotychczasową procedurą.
2. Na tym samym użytkowniku sprawdź trzy stany audio i napisów, przełączanie anime oraz brak prześwitów między MAL/SIMKL.
3. Włącz biblioteki, zweryfikuj pierwsze 10 plakatów, przewijanie kolejnych 25 oraz losowanie.
4. Odtwórz film i odcinek przez „Oglądaj dalej”, także z sezonu i po wcześniejszym otwarciu szczegółów innego tytułu. Potwierdź wznowienie od właściwego miejsca.
5. Jeśli którykolwiek etap zawiedzie, przywróć działające wydanie i konfigurację z checkpointu **0.4.139.0**. Nie kasuj źródeł ani checkpointu.
