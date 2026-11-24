# MisioFlix 0.4.144.0 — pełny katalog i optymalizacja propozycji

Baza: 0.4.143.0. Kandydat do wdrożenia, nie STABLE.

## Zmiany
- Usunięto limit 16 000 rekordów w autoryzowanym `/api/catalog`, wspólnym dla wyszukiwarki i propozycji. Żądania pozostają stronicowane po 400 rekordów, z przesunięciem o faktyczną długość strony, aż Jellyfin zwróci pustą stronę. Krótsza niepusta strona nie kończy skanowania.
- Wyłączono zbędne liczenie całej puli na każdej stronie (`EnableTotalRecordCount=false`); dodano jawne sortowanie po SortName. GUID-y są deduplikowane przed kosztownym wzbogaceniem metadanych. Anulowanie działa także w trakcie przetwarzania strony. Nieprawidłowa odpowiedź lub niepusta strona bez nowych GUID-ów kończy się błędem zamiast utrwalenia niepełnego katalogu.
- Zmieniono wersję klucza cache katalogu w IndexedDB, aby stara obcięta kopia nie została ponownie użyta. Pierwsze pobranie po aktualizacji buduje aktualną kopię; kolejne używają dotychczasowego mechanizmu cache. Nie zmieniono zakresu serwer/użytkownik/biblioteka.
- Przy inicjalizacji propozycji zbiór identyfikatorów bibliotek anime powstaje jeden raz; sezony są sprawdzane tylko w przebiegu dziedziczenia gatunków, nie są kandydatami do losowania. Nie powstaje drugi katalog ani dodatkowe zapytanie.

## Zachowane
Autoryzacja Jellyfina i zakres bibliotek, NFO anime, gatunki sezonów, indeks języków, MAL/SIMKL, native Play/Resume, wygląd, filtry, 10/25 kart i losowanie z całej puli. Diagnostyka nie została rozbudowana (jej wersja komponentu pozostaje 143). Limit 50 000 w osobnym, ręcznie uruchamianym indeksie języków nie należy do tej zmiany.

## Weryfikacja
- `python tools/run_tests.py`: 598 testów Python, 73 skrypty Node — PASS.
- Test JS wykonuje rzeczywistą funkcję inicjalizacji propozycji na syntetycznej puli ponad 17 000 rekordów. Testy Python kontrolują kod paginacji, nie uruchamiają serwera C#.
- Kompilacja .NET 10, faktyczna paginacja Jellyfina i działanie na NAS-ie wymagają sprawdzenia. Nie deklarujemy zmierzonego przyspieszenia. Czas pierwszego pobrania większej biblioteki może wzrosnąć, ponieważ nie pomija się już dalszych rekordów. Paginacja nie jest transakcyjną migawką: skan biblioteki w trakcie pobierania może zmienić kolejność wyników.
