# MisioFlix Native v0.4.61.0 — czwarta, tylko wizualna ramka MAL

Baza: v0.4.60.0 z poprawką testu GitHub Actions (CI FIX).
Checkpoint do przywracania: v0.4.59.0; wcześniejszy: v0.4.45.0.

## Zmiana
- Ramka anime z osobistym statusem `completed` w MAL staje się **pół złota, pół zielona** WYŁĄCZNIE kiedy ten sam film/serial/sezon ma rzeczywiste, widoczne wznowienie w Jellyfin `Oglądaj dalej` (nie `NextUp`, nie ukryte pozycje).
- Po usunięciu pozycji wznowienia, ramka wraca do zielonej; `watching` pozostaje złote, a `plan_to_watch` — różowe.
- W szczegółach ramka jest przypisana do kontenera PLAKATU (nie całej strony).
- Dla plakatów sezonów wykorzystywany jest rzeczywisty Jellyfin `SeriesId` oraz `IndexNumber` (a nie tytuł sezonu). Złoto-zielony może być tylko sezon, którego odcinek znajduje się w `Oglądaj dalej`.
- Kolory są w oddzielnym `Web/mal-frames.css` i odrębnym `data-mf-mal-frame` — **bez użycia klas/stanu Simkl**.
- Rozpoznanie wznowień korzysta wyłącznie z autoryzowanego, odczytowego `/MisioFlix/api/resume` i jest odseparowane per użytkownik.

## Nie zmieniono
- **Ani jednego zapisu do MAL**, jego statusów, ocen, postępu, liczników, cache lub archiwum.
- Brak automatycznego oznaczania anime po 80%, po przejściu do następnego odcinka lub po `✓` Jellyfina.
- Simkl, jego archiwa i skroblowanie, odtwarzacz Jellyfina, NFO, GitHub Actions i baza danych pozostają nietknięte.
- Istniejące trzy stany ramek MAL pozostają bez zmian w przypadku braku wznowienia.

## Testy
- `python -m unittest discover -s tests/current -p 'test_*.py' -q`
- Wszystkie `tests/current/*.cjs` przez Node.js, w tym `mal_mixed_frames_061.cjs`.
- Weryfikacja stylu w Chromium (plakat główny, szerokość 393 i 1280 px).

## Wdrożenie
1. Wgrać pliki ZIP TYLKO_ZMIANY z zachowaniem struktury katalogów.
2. Uruchomić GitHub Actions (kompilacja .NET 10).
3. Zainstalować DLL, zrestartować Jellyfin, odświeżyć aplikację i sprawdzić ukończone anime z aktywnym wznowieniem.

Nie przeprowadzono kompilacji DLL ani testu na rzeczywistym NAS-ie.
