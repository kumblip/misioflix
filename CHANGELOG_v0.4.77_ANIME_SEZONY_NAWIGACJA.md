# MisioFlix Native v0.4.77.0 — nawigacja po sezonach anime

## Zmiany

1. **Przełączanie sezonów nad listą odcinków**: w szczegółach sezonu anime pojawia się jeden poziomy, przewijany rząd małych przycisków `S01`, `S02`, …, pobieranych z autoryzowanej listy sezonów Jellyfin (`Shows/{SeriesId}/Seasons`), posortowanych według `IndexNumber`. Kolor różowy oznacza aktualny sezon. Każdy przycisk kieruje do szczegółów wskazanego sezonu; podpowiedź pokazuje jego nazwę.
2. **Nagłówek sezonu anime**: dotychczasowy podwójny pełny tytuł zastąpiono w widoku sezonu nawigacją `ANIME › Nazwa sezonu`. `ANIME` jest przyciskiem do nadrzędnej serii. Tytuł pochodzi z właściwego elementu Jellyfin (`Name`), nie jest przycinany.
3. **Wstecz jako poziom hierarchii anime**: w anime `Episode → Season → Series → #/home` (gdy identyfikatory są dostępne). Sezon prowadzi do głównego widoku anime, a główna seria do strony głównej, niezależnie od historii przeglądarki. Nie-anime zachowuje wcześniejsze zachowanie przycisku Wstecz.
4. **Brak ingerencji w zwykłe seriale**: żaden nowy przełącznik ani nagłówek nie pojawia się poza sezonami sklasyfikowanymi jako anime. Nie przenosimy istniejących elementów DOM Jellyfina (unikamy błędów attached/detached w Jellyfin 12.4).

## Źródła danych i bezpieczeństwo

- Identyfikator serii: `SeriesId` sezonu (alternatywnie `ParentId` w uboższych DTO Jellyfin).
- Lista sezonów: rzeczywiste elementy serii identyfikowane przez GUID, nie dopasowanie nazwy. Kolejność: `IndexNumber`, bez wymyślania brakujących numerów.
- Ochrona: ten sam autoryzowany użytkownik Jellyfin i istniejący mechanizm tokenów; bez zapisu NFO i bez zmian MAL/Simkl.

## Weryfikacja lokalna

- `python tools/run_tests.py` — **361 testów Python + 28 skryptów Node.js**, wszystkie zaliczone.
- Dodano test nawigacji z symulowanym endpointem listy sezonów, aktywnym przyciskiem, klikaniem i izolacją zwykłych seriali.
- Nie wykonano instalacji/kompilacji DLL ani testu na NAS-ie.
