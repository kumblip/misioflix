# MisioFlix Native v0.4.75.0 — trafniejsze wyszukiwanie i filtr „Obejrzane”

Podstawa: **v0.4.74.0**. Aktualizacja nie zmienia plików NFO, plików wideo, odtwarzania ani synchronizacji MAL/Simkl.

## Naprawa wspólnego błędu OBU wyszukiwarek

W v0.4.74 w `home.js` funkcja `searchableText` sklejała: tytuł, alternatywne tytuły, rok, cały opis (`plot`) i wszystkie gatunki. Wpisanie np. `ari` pasowało zatem do słów z opisów i tagów, chociaż tytuł nie zawierał tych liter.

- **Anime:** wpisane słowo jest porównywane z tytułem oraz alternatywnymi tytułami z NFO, a w trybie zbiorczym również z tytułami powiązanych sezonów/OVA/ONA/Specials. Powiązanie sezonów pozostaje oparte na GUID Jellyfin, nie podobieństwie nazw.
- **Filmy/seriale:** wpisane słowo jest porównywane z tytułem pozycji z Jellyfin (nie z opisem, rokiem ani gatunkiem). Zachowano dotychczasowy osobny zestaw gatunków i wybór typu.
- Filtry gatunkowe nadal działają niezależnie: zaznaczenie gatunku połączy się z wpisanym tytułem przez AND.
- Gdy karta anime pasuje po aliasie lub powiązanej części, pojawia się w niej informacja `Dopasowano: ...` wyjaśniająca trafienie.

## Układ wyszukiwarki anime

Na szerokim ekranie jeden wiersz: **Biblioteki** | **Typy produkcji** | **Obejrzane**.
Przy mniejszej szerokości filtry płynnie przechodzą do dwóch lub jednej kolumny.

Trójstanowy przycisk „Obejrzane”: **obojętnie (szary)** → **tak (zielony)** → **nie (czerwony)** → obojętnie. Filtrowanie nie zmienia statusów w MAL ani Jellyfin.

Po połączeniu MAL filtr korzysta z odczytu istniejącej listy użytkownika (`/mal/status?refresh=false`). `completed` oznacza obejrzane; `watching`, `on_hold`, `plan_to_watch`, `dropped` — nieukończone; nieustalone pozycje nie są zgadywane. Bez połączenia z MAL używane są statusy oglądania z Jellyfin. Status źródła jest podpisany pod wynikami. Działa wyłącznie w wyszukiwarce anime, bez zmiany wyszukiwarki filmów i seriali poza poprawą tekstowego dopasowania.

## Zachowane wcześniej funkcje

- `Season XX` z prawdziwego `season.nfo`, czerwone łapki numerów sezonów nad niebieskimi łapkami odcinków; złote łapki sumarycznej liczby sezonów wyłącznie przy całych seriach.
- `Typ: Seria TV/OVA/ONA/Special` z NFO, podpowiedzi i liczniki odcinków w indywidualnych sezonach.
- Biblioteki, trójstanowe gatunki i typy, MAL, Simkl, karuzele, odtwarzacz.

## Kontrola

357 testów Python oraz 26 testów Node.js, w tym nowy `tests/current/search_titles_watch_filter_075.cjs`: dopasowanie tytułów w obu wyszukiwarkach, ignorowanie opisów/gatunków przy wyszukiwaniu tekstu, aliasy sezonów, łączenie gatunków AND, stan obejrzane, układ filtrów. Testy przeszły. Kod DLL nie został skompilowany ani przetestowany na NAS.
