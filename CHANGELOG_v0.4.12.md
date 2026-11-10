# MisioFlix Native v0.4.12.0 — własne karuzele w natywnej stronie Jellyfin

## Cel

Zostawiamy oryginalne logowanie, górne menu, katalogi bibliotek, ekrany szczegółów i odtwarzacz Jellyfin 12.4. Wstawiamy do istniejącej strony `#/home` lub `#/` **tylko karuzele i kompaktową sekcję „Oglądaj dalej”**. To nie jest osobna aplikacja, iframe, drugi port ani pełnoekranowy portal.

## Zmiany

1. Endpoint `GET /MisioFlix/api/home/libraries` odczytuje biblioteki dostępne dla aktualnego użytkownika z Jellyfin `Users/{id}/Views`. Nie bazuje na globalnej liście.
2. Endpoint `GET /MisioFlix/api/home/shelf` pobiera maksymalnie 24 pozycje na stronę; wymusza `ParentId`, `UserId`, `IncludeItemTypes=Series,Movie` (AnimePL), `Movie` (filmy) lub `Series` (seriale). **Nigdy nie pokazuje odcinków i sezonów zamiast całej serii**.
3. „Ostatnio dodane” sortuje po `DateCreated` pozycji nadrzędnej. „Losuj” wykonuje `SortBy=Random` na całej danej bibliotece. W trybie losowym zwracana jest nowa próba z całego zbioru.
4. Plakaty pobierane są od razu z `Images/Primary`, z natywnym `loading=lazy`. Jellyfin nie ładuje już swoich poziomych miniaturek sekcji „Ostatnio dodane”, o ile zostały wyłączone w preferencjach użytkownika.
5. Anime ma tytuł, rok, gatunki, format i opis **wyłącznie z NFO**; inne produkcje — z Jellyfin. Ocena przy łapce to ocena aktualnego użytkownika (`UserData.Rating`), nie z serwisu filmowego. Brak oceny oznacza brak badge'a.
6. Trzy statusy obejrzenia z Jellyfin: jasnoróżowy, bursztynowy i zielony.
7. „Oglądaj dalej” korzysta z Resume + NextUp Jellyfin oraz zachowanego prywatnego pliku ukryć. Każdy użytkownik ma oddzielny stan ukrycia. Ukryj/przywróć **nie zmienia** historii oglądania.
8. Przy ukrywaniu nie uruchamiamy już pełnego skanowania katalogu; kontrolujemy dostęp do pojedynczej pozycji przez Jellyfin `/Items?Ids=...&UserId=...`.
9. Własne półki są montowane tylko wewnątrz istniejącej strony głównej i usuwane po przejściu do biblioteki lub szczegółów. Kliknięcie logo (`#/`) nie tworzy duplikatu.
10. Zachowano dotychczasowe serwerowe API NFO, sezonów, indywidualnych ocen i MAL z wcześniejszych wersji. Interfejs MAL w oryginalnych szczegółach nadal nie został ukończony.

## Weryfikacja

- `node --check` dla `client.js` oraz `home.js`.
- 12 testów istniejącego motywu + 8 testów nowych kontraktów API.
- Test w lokalnym Chromium z zamockowanymi odpowiedziami: pięć półek, widok Resume, losowanie z podanym `libraryId`, ukrywanie i nawigacja SPA. **To nie jest test na działającym Jellyfin ani kompilacja DLL.**
- Kompilację C# wykona GitHub Actions; wynik trzeba sprawdzić przed publikacją.

## Granice

- Jeżeli Jellyfin nie połączył poprawnie wielu fizycznych sezonów w jeden obiekt `Series`, sam motyw ich nie połączy. Wtedy trzeba skorygować strukturę serii w Jellyfin/NFO.
- „Ostatnio dodane” dotyczy daty dodania serii/filmu, nie daty najnowszego odcinka.
- W odtwarzaniu karta wznowienia kieruje do **oryginalnego szczegółu odcinka/filmu**, gdzie używany jest oryginalny odtwarzacz Jellyfin.
- Pełne sprawdzenie endpointów na Jellyfin 12.4 i czasów odpowiedzi jest obowiązkowe po instalacji.
