# MisioFlix Native v0.4.19.0 — odtwarzanie, informacja, usuwanie, menu i GitHub Actions

## Zmiany w „Oglądaj dalej”

- Kliknięcie plakatu, tytułu albo pustego miejsca kafelka wywołuje natywną akcję **resume** Jellyfin na dokładnym `resumeId` (film/odcinek) z `positionTicks` z danych bieżącego użytkownika. Nie odtwarza całej serii ani sezonu. Nie podmienia odtwarzacza Jellyfin.
- Dla ograniczonej zgodności, jeśli delegowany interfejs Jellyfin Web nie przejmie akcji, próbowany jest dostępny publiczny manager odtwarzania; ostatecznym bezpiecznym zapasowym zachowaniem jest otwarcie szczegółów danego filmu/odcinka. Działanie na faktycznej wersji Jellyfin 12.4 należy potwierdzić na NAS-ie.
- Mały, okrągły przycisk **i** otwiera stronę główną anime/serialu (`item.id`), a dla filmu stronę filmu; nie uruchamia odtwarzania.
- Normalny **×** nadal tylko ukrywa kartę; „Pokaż ukryte” pozwala zobaczyć ukryte pozycje.
- Przy ukrytej karcie dostępne są niezależne **Przywróć** i **Usuń**.
- **Usuń** po potwierdzeniu zeruje punkt wznowienia *dokładnego filmu/odcinka* w danych zalogowanego użytkownika Jellyfin i zapisuje odrębne wykluczenie serii/filmu w `removed-resume.json`; nie kasuje pliku, nie usuwa pozycji z biblioteki, nie zmienia statusu obejrzenia ani postępu innych kont. Wykluczona pozycja nie pozostaje w „Pokaż ukryte”. Jeżeli Jellyfin zarejestruje późniejszą nową sesję oglądania, pozycja może wrócić.

## Menu administracyjne Jellyfin

- Plik `Plugin.cs` na bazie istniejącego w repo `kumblip/misioflix` włącza **EnableInMainMenu** i nazwę **MisioFlix** dla istniejącej osadzonej strony konfiguracji. To oficjalny mechanizm `IHasWebPages/PluginPageInfo`, bez modyfikowania Jellyfin Web.
- Faktyczne miejsce wyświetlania zależy od wariantu menu Jellyfin 12. Należy potwierdzić w lewym panelu po restarcie serwera i odświeżeniu strony.

## Jednorazowa aktualizacja GitHub Actions

- `.github/workflows/build.yml` i `release.yml` wykrywają **wszystkie** `tests/test_*.py` i `tests/*.cjs`, zamiast wpisywania nazw testów kolejnych wersji.
- W obu workflow nowe `tools/sync_version.py` pobiera wersję z **`meta.json`** i synchronizuje `Version`, `AssemblyVersion`, `FileVersion` w `.csproj` przed kompilacją.
- `ScriptInjection.cs` generuje cache-busting `?v=` z wersji skompilowanej DLL; kolejne wydania nie wymagają aktualizacji numerów w znacznikach HTML.
- Istniejące `tools/package.py` już publikuje wersję/tag/ścieżkę archiwum jako `steps.pack.outputs.*`; jego zachowanie pozostało bez zmian.
- Po **jednym** podmienieniu workflow w 0.4.19 kolejne aktualizacje nie muszą zawierać nowych plików `.github/workflows` (o ile nie zmienia się sam proces budowy).

## Zachowane

- Oryginalna struktura Jellyfin, pięć bibliotek + dwie niezależne wyszukiwarki.
- 52 gatunki NFO w anime i gatunki z Jellyfin w filmach/serialach; trójstanowe filtry.
- Wszystkie aktywne i ukryte pozycje w karuzeli, przewijanie, 5 wyników losowania i stałe przyciski „Losuj” / „Ostatnio dodane”.
- Statusowe ramki, „Oglądaj dalej” i izolacja styli motywu podczas odtwarzania (naprawa czarnego obrazu z v0.4.17).

## Testy lokalne

- **50/50** testów źródłowych Python, 2 testy Node, 2 scenariusze Chromium.
- Weryfikacja poprawnej ścieżki natywnego odtwarzania, ID serii / ID odcinka, pozycji wznowienia i żądania „Usuń” na mockowanym interfejsie Jellyfin.
- **Nie wykonano** kompilacji DLL w tym środowisku i nie uruchomiono v0.4.19 na UGREEN / Jellyfin 12.4. Rzeczywiste zachowanie i obsługa połączenia ze stroną administracyjną wymagają weryfikacji.
