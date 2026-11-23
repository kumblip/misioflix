# MISIOFLIX — MAPA WSZYSTKICH BIBLIOTEK JELLYFIN

**Cel:** poprawne wykrywanie wszystkich bibliotek i ich ścieżek po zmianie nazw oraz folderów, bez ingerowania w same zasoby Jellyfina.

## Wybór wariantu

- **BEZ_FLAG**: dla kodu źródłowego bazującego na działającej wersji 0.4.121.0 / etapie 00 z archiwum przekazania. Nie używaj tego wariantu, jeśli aktualny repozytorium ma już pliki language-flags.js i language-flags.css — wgranie starszego configPage i CatalogService wyłączyłoby flagi.
- **Z_FLAGAMI**: dla źródeł etapu 04 z wcześniejszego przekazania (flagi po lewej, indeks języków, bez automatycznego skanowania przy wyświetlaniu).

Oba warianty bazują na zachowanych źródłach. Nie znam bieżącego stanu gałęzi main po dzisiejszych zmianach, dlatego sprawdź zawartość repo przed wgraniem. Nie mieszaj plików z obu wariantów.

## Co zostało dodane

- Sekcja `MisioFlix — ustawienia → Biblioteki Jellyfin — ścieżki i klasyfikacja`.
- Odczyt wszystkich istniejących bibliotek przez `GET /Library/VirtualFolders` (natywne API Jellyfina, autoryzacja administratora).
- Nazwa, identyfikator, typ biblioteki, ścieżki źródłowe Jellyfina oraz edytowalne ścieżki widziane z kontenera.
- Typ: Zwykła biblioteka / Anime PL — NFO + MAL / Anime ENG — NFO + MAL.
- Język awaryjny dla pojedynczej ścieżki audio bez poprawnych metadanych: PL / EN / z nazwy biblioteki (wariant z flagami).
- Nowe biblioteki pojawiają się po otwarciu sekcji ustawień i kliknięciu `Odśwież listę bibliotek z Jellyfina`.
- Zapisywane mapowanie po identyfikatorze biblioteki; zmiana samej nazwy nie zrywa mapowania.
- Jeżeli ścieżka nie była ręcznie zmieniana, po ponownym odczycie nowa ścieżka Jellyfina zastępuje starą w formularzu. Jeżeli była ręcznie zmieniona, pozostaje do decyzji administratora. `Użyj ścieżek Jellyfina` przywraca fizyczne lokalizacje z serwera.
- Zmiana konfiguracji aktualizuje `AnimeRoot` i `AnimeOriginalRoot` dla wstecznej kompatybilności, a nowy algorytm potrafi obsługiwać wielokrotne foldery anime.
- Nowy znacznik rewizji katalogu zapobiega używaniu zapisanej lokalnie, 14-dniowej migawki wyszukiwania po zmianie konfiguracji bibliotek.

## Pierwsza konfiguracja po zmianie folderu

1. Wgraj pliki tej łatki przez stronę GitHub do **odpowiadających im katalogów**. Nie wgrywaj samego ZIP-a do repozytorium. Nie ruszaj `.github` ani manifestu wersji.
2. Uruchom nowy build w Actions; po przejściu testów i kompilacji .NET opublikuj nową wersję istniejącym automatycznym workflow.
3. W Jellyfinie uruchom `Kokpit → Wtyczki → MisioFlix → Ustawienia`.
4. Rozwiń sekcję `Biblioteki Jellyfin — ścieżki i klasyfikacja`.
5. Kliknij `Odśwież listę bibliotek z Jellyfina`. Powinny pojawić się WSZYSTKIE biblioteki z ich ID i ścieżkami.
6. Sprawdź `Anime PL`: `Anime PL — NFO + MAL`, ścieżka **/media/raid/anime_lektor**.
7. Sprawdź `Anime ENG`: `Anime ENG — NFO + MAL`, ścieżka **/media/raid/anime** (lub aktualna z Jellyfina).
8. Wszystkie filmy i zwykłe seriale: `Zwykła biblioteka`. Upewnij się, że każdy wiersz ma poprawne ścieżki kontenerowe, np. `/media/raid/...`, a nie `X:\` lub `/volume1/...`.
9. Kliknij **`Zapisz ścieżki i role w MisioFlixie`**.
10. Odśwież stronę MisioFlixa (Ctrl+F5), sprawdź karuzelę Anime PL i `Wyszukiwarka anime → Odśwież dane`.
11. Zweryfikuj, czy pojawiły się gatunki z NFO, oznaczenie ANIME, powiązania z MAL i plakaty.

## Bezpieczeństwo / ograniczenia

- Panel **nie zmienia ścieżek zapisanych w samym Jellyfinie**, nazw bibliotek, NFO ani plików wideo. Zmienia wyłącznie ustawienia klasyfikacji wtyczki. Przenoszenie folderów nadal wykonuje się osobno.
- Nie skanuje wszystkich multimediów przy otwieraniu panelu: pobiera tylko listę wirtualnych bibliotek i ich katalogów.
- Zapisana konfiguracja jest automatycznie wykrywana przez stronę główną; same zmiany w katalogach Jellyfina trzeba wprowadzić do wtyczki przyciskiem Zapisz.
- Gdy serwer nie może udostępnić listy bibliotek, panel blokuje zapis i nie kasuje dotychczasowej konfiguracji.
- Gdy używasz wersji z flagami: po zmianie fizycznych plików uruchom osobno `Odśwież bazę języków audio i napisów`.
- Zmiana ścieżki nie gwarantuje zachowania starych Jellyfin ItemId, jeśli Jellyfin na nowo zaimportował wszystkie media. To niezależna migracja po stronie Jellyfina.

## Testy lokalne w tym archiwum

- Wariant BEZ_FLAG: 530 testów Python + 60 skryptów Node, wszystkie OK.
- Wariant Z_FLAGAMI: 546 testów Python + 60 skryptów Node, wszystkie OK.
- Obydwa pliki configPage.html sprawdzone parserem JavaScript (`node --check`).
- Nie było kompilacji .NET 10 ani testu w działającym Jellyfinie; te wymagają GitHub Actions / uruchomienia na NAS.

## Pliki łatek

- `src/Jellyfin.Plugin.MisioFlix/Configuration/PluginConfiguration.cs`
- `src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs`
- `src/Jellyfin.Plugin.MisioFlix/Web/configPage.html`
- `src/Jellyfin.Plugin.MisioFlix/Web/home.js`
- `tests/current/test_anime_dual_root_105.py`
- `tests/current/test_proposal_sets_108.py`
- `tests/current/test_library_paths_dynamic.py` (nowy)

Żaden z tych plików nie jest workflow w `.github`, numerowanie pozostaje automatyczne.
