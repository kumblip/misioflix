# v0.4.71.0 — paski statusów na natywnej liście odcinków Jellyfina

## Przyczyna
W v0.4.67 natywne elementy szczegółów przestały być fizycznie przenoszone między kontenerami DOM, dzięki czemu zadziałał edytor metadanych i ustało wyzwalanie `addScrollEventListener` podczas przełączania widoku.
Moduły MAL/Simkl nadal szukały odcinków pod `.mf-detail-series-sections` (secondary), podczas gdy Jellyfin 12.4 renderuje `#listChildrenCollapsible #childrenContent` wewnątrz `.detailPagePrimaryContent`. Dlatego w v0.4.70 CSS pasków był poprawny, ale klasy statusów nie były nadawane widocznym odcinkom.

## Poprawka
- MAL i Simkl szukają odcinków wyłącznie pod natywnym `#listChildrenCollapsible #childrenContent` bieżącego tytułu.
- Pozostaje identyfikacja odcinków po prawdziwym GUID i autoryzowanej liście, aby nie przenosić stanów między sezonami ani seriami.
- Nadal wyłącznie paski: różowy/złoty/zielony z lewej, zielony lewy + złoty dolny dla statusu mieszanego.
- Nasłuchiwanie przycisków natywnych odcinków MAL dopasowane do nowego kontenera; tylko odświeża widok.
- Usunięty błąd składni SVG `Expected number` we wspólnej wizualnie ścieżce łapki (oddzielnie w MAL i Simkl).
- Bez zmian synchronizacji, usług, punktów widoku i natywnych elementów Jellyfina.

## Uwagi
Nie ma automatycznych zapisów do MAL. Edytor metadanych v0.4.67 pozostaje nietknięty. Wymagane potwierdzenie na NAS-ie.
