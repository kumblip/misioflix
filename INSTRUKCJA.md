# MisioFlix — karuzele Anime PL/ENG i widoczność w ustawieniach

Data: 2026-11-23. Baza: źródła ostatniej paczki „KARUZELE_ANIME_PL_NAPRAWA” (dwa osobne warianty).

## Co pokazują zrzuty i co wykazała analiza kodu

1. W ustawieniach karuzel są Kolekcje i sześć innych bibliotek, ale brakuje Anime PL/ENG.
   Przyczyna w kodzie: panel odrzucał w `Library/VirtualFolders` bibliotekę bez podanego
   `CollectionType`, chociaż panel ścieżek interpretował taką bibliotekę jako `mixed`.
   Po poprawce oba panele rozpoznają taki sam brak typu jako `mixed` i respektują
   zapisaną rolę `anime_pl`, `anime_eng`, `anime_both`.
2. Na stronie głównej widnieją Anime PL i Anime ENG; ENG ma jedną pozycję, a PL jest pusta.
   W konfiguratorze ścieżka jest pokazywana z bieżącego stanu Jellyfina NAWET
   jeśli administrator nie kliknął „Zapisz ścieżki i role”. W takim przypadku
   serwer nadal może korzystać z `AnimeRoot=/media/raid/animelektor`, podczas gdy
   nowy folder to `/media/raid/anime_lektor`. Jest to bardzo prawdopodobny powód,
   ale NIE jest potwierdzony bez odczytu aktywnej konfiguracji na NAS-ie.
3. Dodano wyraźne ostrzeżenie w panelu, gdy `LibraryPathsConfigured=false`.
4. Jeśli po zapisaniu ścieżek karuzela nadal jest pusta, MisioFlix dodatkowo spróbuje
   odczytać bezpośrednie foldery przez autoryzowany wariant `Users/{userId}/Items`
   (alternatywa dla `Items?UserId=...`). Akceptuje tylko rzeczywiste NFO we właściwym
   katalogu; nie skanuje globalnie serwera i nie zmienia plików na dysku.

## Dokładne kroki po aktualizacji

1. Kokpit Jellyfin → Wtyczki → MisioFlix → „Biblioteki Jellyfin — ścieżki i klasyfikacja”.
2. Dla `Anime PL` sprawdź rolę `Anime PL — NFO + MAL` i ścieżkę `/media/raid/anime_lektor`.
   Dla `Anime ENG` rolę `Anime ENG — NFO + MAL` i ścieżkę `/media/raid/anime`.
3. Kliknij **„Zapisz ścieżki i role”**. Samo „Użyj ścieżek Jellyfina” nie zapisuje zmian.
4. „Karuzele strony głównej” → „Odśwież listę karuzel”. Na liście powinny być też
   Anime PL i Anime ENG; ustaw kolejność/widoczność i kliknij „Zapisz kolejność”.
5. Odśwież stronę Jellyfina (`Ctrl+F5`) i sprawdź stronę główną.

## Jeśli nadal jest pusto

- Sprawdź w narzędziach deweloperskich (F12 → Sieć/Network), czy żądanie
  `MisioFlix/api/home/shelf?libraryId=53e751439e5d36e699d03863df66b710&mode=latest&startIndex=0&limit=10`
  zwraca `items: []` lub błąd HTTP. **Nie udostępniaj tokenów/cookies**.
- Sprawdź `MisioFlix/api/home/libraries`: czy pozycja Anime PL ma `category: "anime"`.
- Jeżeli nadal `items: []`, potrzebne są liczniki/typy odpowiedzi Jellyfina; ta poprawka
  nie jest dowodem, że 603 pozycje będą wyświetlane na każdym serwerze Jellyfin.

## Zakres i weryfikacja

Zmodyfikowane pliki: `src/Jellyfin.Plugin.MisioFlix/Web/configPage.html`,
`src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs`.
Dodane testy: `tests/current/test_carousel_virtual_folder_consistency.py`,
`tests/current/carousel_virtual_folder_consistency.cjs`.

- Z flagami: 561/561 Python i 61/61 Node.
- Bez flag: 545/545 Python i 61/61 Node.
- Sprawdzono składnię JS; brak lokalnej kompilacji .NET i brak testu na NAS-ie.
- Żadne media, NFO, obrazki, uprawnienia, repozytoria, MAL/Simkl ani workflow `.github`
  nie zostały zmienione.

## Wgrywanie tylko przez WWW GitHub

Wybierz JEDEN wariant zgodny z aktualnym repozytorium, rozpakuj ZIP.
Wgraj pliki do **odpowiadających im ścieżek** w repo przez `Add file → Upload files`.
Nie wgrywaj ZIP-a w całości jako jednego pliku i nie mieszaj wariantów.
Następnie sprawdź `Actions` i uruchom publikowanie zgodnie z istniejącym workflow.
Numerowanie buildów nie zostało zmienione.

## Powrót

Zachowano pełne archiwa sprzed poprawki (z rozmowy) i najnowsze źródła w osobnych ZIP.
W razie regresji przywróć poprzedni commit przez Revert PR lub pliki z backupu,
nie usuwaj bibliotek Jellyfina.
