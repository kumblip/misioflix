# MisioFlix Native v0.4.82.0 — Infinite scroll w natywnych bibliotekach

## Zakres

- Dodano osobny, niewymagający KefinTweaks moduł `Web/library-scroll.js`.
- Dotyczy tylko natywnych tras bibliotek Jellyfin 12.4 z `topParentId`: `#/mixed`, `#/movies`, `#/tv`, `#/music` (pierwsza zakładka biblioteki).
- Pierwszą stronę (do 100 pozycji) nadal ładuje natywny Jellyfin. Kolejne pozycje są pobierane bezpośrednio z Jellyfin API `Users/{userId}/Items`, z `StartIndex` i `Limit=100`, i dopisywane jako odrębna sekcja pod natywnymi kafelkami.
- Filtry, sortowanie i bibliotekę weryfikujemy z faktycznym zapytaniem natywnego widoku, jeśli jest dostępne w historii zasobów przeglądarki. Porównujemy widoczne elementy z danymi zwróconymi przez API przed rozpoczęciem doładowywania.
- Przy wykryciu innego porządku wyników moduł nie doładowuje ich, żeby nie mieszać filtrów; natywna paginacja pozostaje dostępna.
- Rozpoznawane są przewijanie okna i wewnętrznych kontenerów (IntersectionObserver + awaryjna kontrola scrolla).
- W `client.js` doładowane karty otrzymują dokładnie te same nakładki danych MisioFlix (w tym MAL/Simkl) co istniejące, bez ingerowania w React-owe karty Jellyfina.
- Nie zmieniono wyszukiwarki anime, wyszukiwarki filmów/seriali, Kolekcji ani karuzel na stronie głównej.

## Z KefinTweaks

Na podstawie kodu użytkownika przeanalizowano `scripts/infiniteScroll.js` i zastosowano koncepcję paginacji z Jellyfin API oraz observera przewijania. Nie dołączono innych funkcji ani zależności KefinTweaks. Działanie jest zaimplementowane samodzielnie, zgodnie z wcześniejszą architekturą natywnego MisioFlixa.

## Ograniczenia

- Część biblioteki jest sterowana przez React Jellyfina. Nowa sekcja jest odrębna, dzięki czemu nie trzeba przenosić ani nadpisywać natywnych kart, ale bez testów na działającym serwerze nie da się zagwarantować zgodności ze wszystkimi wersjami komponentów 12.4.
- Przy nietypowym filtrze, braku danych do ustalenia sortowania, niezgodności API, błędzie sieci lub nieobsługiwanej zakładce pozostaje oryginalna paginacja Jellyfina.
- Karty doładowane poza React używają nawigacji do szczegółów, a nie wszystkich interaktywnych skrótów natywnej karty.
- Nie zmieniono liczby pozycji początkowej strony ani jej natywnych kontrolek.
