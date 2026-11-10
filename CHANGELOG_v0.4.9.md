# MisioFlix Native v0.4.9.0 — oryginalny Jellyfin, pełniejszy motyw

## Architektura
- **Nie ma osobnej strony ani katalogu MisioFlix.** Pozostają natywne karty, karuzele, adresy `#/details`, przyciski i odtwarzacz Jellyfin 12.4.
- Oryginalny DOM `.card > .cardBox > .cardScalable > .cardImageContainer` ustalony na podstawie diagnostyki użytkownika.
- Nowy, samodzielny CSS wzorowany *koncepcyjnie* na rozwiązaniach Netflin: paleta Jellyfin Modern, spójny gutter, karty, skeletony, szczegóły, mobile, menu.
- Brak zależności od Netflin, Media Bar, KefinTweaks lub JavaScript Injectora. Nie kopiowano arkusza Netflin.

## Wygląd
- Motyw brzoskwiniowo-różowy/fioletowy, mniejsze nagłówki i odstępy.
- Ukrycie redundantnej sekcji „Moje multimedia” na dużym ekranie **tylko wtedy**, kiedy oryginalny górny pasek zawiera linki do bibliotek.
- Kompaktowe „Kontynuuj odtwarzanie” z oryginalnym wznowieniem Jellyfin.
- Oryginalne karty: wyraźniejsze kontury, dopasowane podpisy, zaokrąglenia i delikatny hover.
- Nakładka na oryginalnym obrazie: `ANIME / FILM / SERIAL / ODCINEK`, pod nim rok/format mniejszą czcionką.
- Trzy kolory statusu: jasnoróżowy (nieobejrzane), bursztynowy (rozpoczęte), zielony (obejrzane). Nie zgadujemy statusów całych serii, kiedy Jellyfin nie zwraca danych zbiorczych.
- Maksymalnie trzy gatunki na dole obrazu, kiedy są dostępne.
- Jeden wąski półprzezroczysty kontener statystyk, duże liczby i małe kolorowe kocie łapki **po prawej**. `99+` dla liczby powyżej 99.
- Ujednolicone kolory ekranów szczegółów, menu, dialogów i kontrolek odtwarzacza (bez zmian funkcjonalnych).
- Mobile, focus i `prefers-reduced-motion`; delikatne pulsowanie oryginalnych placeholderów.

## Dodatkowe dane — bez skanowania całej biblioteki
- `GET /MisioFlix/api/overlays?ids=...` sprawdza tożsamość użytkownika Jellyfin i zwraca wyłącznie do 18 wskazanych elementów, które Jellyfin mu udostępnia.
- Frontend pobiera metadane dopiero dla widocznych kart (IntersectionObserver); bez równoległego `/api/catalog`, bez budowy drugiego katalogu i bez pobierania drugich obrazów.
- Anime: `genre`, rok i format **wyłącznie z NFO**. Brak NFO = brak tych nakładek, bez zgadywania z bazy Jellyfin.
- Filmy/seriale nie-anime: gatunki i liczniki z danych Jellyfin.
- Ocena w łapce to indywidualna `UserData.Rating` Jellyfin, nie `CommunityRating`, IMDb, TMDb lub średnia MAL.
- Jeżeli endpoint albo token są niedostępne, natywne karty pozostają sprawne.

## Co nadal wymaga osobnej implementacji
- Indywidualna ocena z **konta MAL** zamiast oceny Jellyfin oraz jej zapis z oryginalnego widoku szczegółów.
- Edycja MAL i oddzielna wyszukiwarka NFO jako rozszerzenia oryginalnych ekranów (bez portalu).
- Losowanie spośród **całej** biblioteki (nie tylko aktualnie załadowanej karuzeli).
- Zintegrowane ukrywanie pozycji z natywnego „Kontynuuj odtwarzanie”.
- Wymuszanie pionowego obrazu dla mieszanej biblioteki `AnimePL`: nie zastępujemy obrazów bez testu jakości/performance.

## Uwaga testowa
Kontrole lokalne nie zastępują kompilacji .NET 10 ani testów na realnym Jellyfin 12.4. Przed publikacją wydania konieczny jest zielony GitHub Actions Build i sprawdzenie oryginalnych ekranów szczegółów, sezonów, odtwarzania oraz nakładek na NAS-ie.
