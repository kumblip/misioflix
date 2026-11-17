# MisioFlix v0.4.95 — prawdziwe kolekcje Jellyfina z wielu tagów NFO

## Żądanie
Przykładowy plik `movie.nfo` lub `tvshow.nfo`:

```xml
<set>Marvel</set>
<set>Avengers</set>
<sorttitle>Marvel 002</sorttitle>
```

Film lub seria ma należeć do **obu** rzeczywistych kolekcji Jellyfina: `Marvel` i `Avengers`.

## Implementacja
- Nowy serwis `MisioFlixNfoCollectionsService` (hosted + singleton) odczytuje lokalne NFO **wyłącznie dla pozycji Movie/Series istniejących w bibliotece Jellyfina**.
- Parser XML odczytuje wszystkie bezpośrednie `<set>` w `movie.nfo`, `tvshow.nfo` (i filmowym `<nazwa>.nfo`). Deduplikuje nazwy case-insensitive, pomija puste i niebezpieczne nazwy folderów.
- Tworzy brakujące natywne BoxSet przez `ICollectionManager.CreateCollectionAsync(CollectionCreationOptions{ Name, ItemIdList })`.
- Do istniejących BoxSetów o identycznej nazwie dodaje tylko brakujące pozycje przez `ICollectionManager.AddToCollectionAsync`.
- Działa w trybie **add-only**. Nigdy nie usuwa kolekcji/członkostw ani nie modyfikuje `movie.nfo`, `tvshow.nfo`, nazw plików czy folderów.
- Automatyczne działanie: po 2 minutach od startu Jellyfina, następnie co 30 minut; można wyłączyć w panelu wtyczki. Ręczna synchronizacja jest dostępna z przycisku administratora.
- Nowe admin-only endpointy: `GET MisioFlix/api/nfo-collections/status` i `POST MisioFlix/api/nfo-collections/sync` (`Policies.RequiresElevation`).
- Limity bezpieczeństwa: 20 000 przetwarzanych pozycji, 500 kolekcji, 32 tagi set/pozycję i 2 mln znaków na NFO. Parser zabrania DTD i zewnętrznych encji XML.

## Sorttitle — ważne ograniczenie Jellyfina
`<sorttitle>` jest **jedną globalną nazwą sortowania produkcji**. Jellyfin importuje ją samodzielnie. Nie da się w jednym NFO przypisać osobnego sortowania Marvel i Avengers; wtyczka nie nadpisuje globalnego `SortName`, żeby nie niszczyć wcześniejszych ustawień.

## Weryfikacja po wdrożeniu
1. Zrób kopię danych konfiguracyjnych Jellyfina i kolekcji przed pierwszym uruchomieniem.
2. Zweryfikuj prawa dostępu kontenera do katalogów zawierających NFO.
3. W panelu administratora MisioFlix kliknij `Synchronizuj kolekcje z NFO teraz`.
4. Sprawdź, że film z dwoma setami jest w obu BoxSetach oraz widoczny w native Jellyfin i MisioFlix.
5. Ponów synchronizację: liczba nowo utworzonych kolekcji i dodanych członkostw powinna wynosić 0.
6. Dodaj trzeci set i sprawdź tylko nowy BoxSet; usuń set z NFO i potwierdź, że istniejące członkostwa pozostają (tryb add-only).
7. Sprawdź, że sortowanie według SortName respektuje importowany przez Jellyfin `sorttitle`.

## Granice testów
Testy jednostkowe/statyczne i Node nie są odpowiednikiem faktycznej kompilacji .NET 10 i integracji z Jellyfin 12.4 na NAS-ie. GitHub Actions musi zbudować DLL; nowe API wymaga testu na serwerze.
