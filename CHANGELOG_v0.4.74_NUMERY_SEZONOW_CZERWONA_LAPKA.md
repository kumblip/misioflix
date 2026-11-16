# MisioFlix Native v0.4.74.0 — numeracja osobnych sezonów anime

Podstawa: pełne źródła v0.4.73.0. Zmiany dotyczą wyłącznie wyszukiwarki anime oraz numeru wersji.

## Zmiany

- API katalogu anime udostępnia nowe `season_number` odczytane z **tego konkretnego** `season.nfo`: `<seasonnumber>...`.
- W liście podpowiedzi pod polem wyszukiwarki osobny sezon wyświetla teraz: `rok · Season 01 · typ z NFO · N odcinków`.
- W wynikach wyszukiwarki osobna karta sezonu ma **czerwoną łapkę** z jego numerem `01`, `02` itd. w górnej pozycji licznika, **nad niebieską łapką** liczby odcinków.
- Karta głównej serii nadal używa **złotej łapki** sumarycznej liczby sezonów i nie ma czerwonej łapki numeru pojedynczego sezonu.
- Brak lub błędna wartość `<seasonnumber>` oznacza brak numeru w UI; nie zgadujemy go po tytule, roku, kolejności wyników ani `ChildCount`.
- Bez zmian: pobieranie typów z `Typ: ...` z NFO, liczba odcinków z Jellyfin, MAL/Simkl, karuzele, odtwarzanie, pozostałe filtry, NFO oraz pliki multimediów.

## Arifureta — potwierdzone `season.nfo` z 15/16.11.2026

| NFO | Tytuł | Typ | Liczba odcinków widoczna w testowym katalogu |
| --- | --- | --- | ---: |
| Season 01 | Prologue | ONA | 1 |
| Season 02 | Arifureta (2019) | Seria TV | 13 |
| Season 03 | 2nd Season (2022) | Seria TV | 12 |
| Season 04 | Yorimichi (2022) | Special | 1 |
| Season 05 | Season 3 (2024) | Seria TV | 16 |

Uwaga: `Season 05` to numer sezonu/kolejnej części w Jellyfin, a nie numer piątego sezonu TV. NFO zawiera `seasonnumber`, ale nie jest źródłem liczby odcinków — ta pochodzi z biblioteki Jellyfin.

## Testy

Dodano test JS zachowania podpowiedzi, wizualnych liczników (kolejność/czerwony/niebieski/złoty) i braku numeru, jeśli NFO nie ma `seasonnumber`. Zachowano testy regresji poprzednich wersji. DLL nie została skompilowana ani przetestowana na NAS.
