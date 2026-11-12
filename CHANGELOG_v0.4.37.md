# MisioFlix Native 0.4.37.0

## AnimePL `#/mixed`

- Przywrócono nakładki MisioFlix na natywnych kartach anime: **ANIME, rok i typ**, liczby sezonów i odcinków, **ocena MAL zalogowanego użytkownika**, pierwsze 3 gatunki NFO oraz skrócony opis.
- Ramki anime nadal zależą wyłącznie od statusu **MyAnimeList** (zielona: completed; bursztynowa: watching/on_hold; różowa: plan_to_watch/dropped; bez danych: neutralna).
- Nakładki opierają się na istniejących atrybutach danych i pseudoelementach CSS. Nie są dodawane elementy potomne do kart WebComponents/React ani zmieniane kontrolery przewijania Jellyfin.
- Dekoracje CSS włączają się tylko na trasie `#/mixed`, dzięki czemu nie duplikują się w innych bibliotekach.
- Ocena w nakładce aktualizuje się również po załadowaniu lokalnej pamięci MAL, bez pobierania informacji o każdym tytule z internetu.

## Liczba powtórek MAL

- W szczegółach anime pole **„Ponowne obejrzenia”** pokazuje bezpośrednio `times_rewatched`, tj. `num_times_rewatched` z MAL: **5 w MAL → 5 w MisioFlix**, nie 6.
- Wartość `0` pozostaje zerem, a brak danych jest wyświetlany jako **„Brak danych”**.
- Nie zmieniono zapisywania do MAL, cache, tokenów, NFO ani serwerowego odczytu liczby odcinków.

## Wydania i manifest

- Numer wersji pobierany z `meta.json`: `0.4.37.0`. Nie wymaga edycji `.github/workflows/build.yml` ani `release.yml`.
- `Build` tworzy artefakt testowy, **nie publikuje wydania**. Aby nowa wersja była dostępna w katalogu Jellyfin, po Build uruchom osobny workflow publikacji z parametrem `PUBLIKUJ`. Dopiero on tworzy Release z archiwum oraz aktualizuje `manifest.json` i jego checksum.
- Katalog Jellyfin może przechowywać poprzednią wersję do kolejnego odświeżenia repozytorium; sam commit manifestu nie wymusza natychmiastowej instalacji na serwerze.

## Testy lokalne

- 149/149 testów Python, 2/2 skrypty Node.
- Chromium: nagłówek, rok, liczba sezonów i odcinków, ocena MAL, gatunki, opis i ramka renderowane przez CSS; bez dodawania dzieci do natywnej karty.
- Nie kompilowano DLL i nie testowano aktualizacji na rzeczywistym NAS-ie.
