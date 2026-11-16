# Testy i ograniczenia — MisioFlix Native 0.4.0

## Sprawdzone w aktualnym środowisku

- [x] Składnia JS: `node --check`.
- [x] Struktura manifestu i zgodność numeracji w źródłach.
- [x] Obecność wszystkich grafik, CSS i JS.
- [x] Przykładowe `tvshow.nfo` — tytuł rōmaji, cztery gatunki i tag typu.
- [x] W JS istnieją dwa odrębne widoki wyszukiwania; nie ma zewnętrznych CDN.

## Niewykonane / wymagające weryfikacji

- [ ] Kompilacja C# dla `net10.0`, `Jellyfin.Controller/Model/Common 12.4.0`.
  Ten komputer nie ma `dotnet` i nie ma połączenia z NuGet. GitHub Actions wykonuje
  kompilację i zatrzymuje pakowanie, jeżeli kod nie przejdzie kompilatora.
- [ ] Załadowanie wtyczki do działającego Jellyfin 12.4.0.
- [ ] Middleware przechwyci właściwy `index.html`, nie kolidując z CSP, cache i innymi wtyczkami.
- [ ] Ładowanie klienta Jellyfin Web i jego tokenu po zalogowaniu.
- [ ] Prawidłowe filtrowanie dostępu na zwykłym koncie użytkownika.
- [ ] Logika NFO na prawdziwej bibliotece anime; NFO używa wyłącznie danych XML.
- [ ] Odtwarzanie i powrót przez natywny Jellyfin Web w przeglądarce.
- [ ] Android / iOS / Desktop z własnymi klientami WWW.
- [ ] Wszystkie standardowe widoki kart zastąpione wyglądem misioflix.

## Pierwszy test na UGREEN

Po skompilowaniu i instalacji:
1. `/MisioFlix/api/health` odpowiada `version: 0.4.0`.
2. Konsola serwera nie pokazuje błędu ładowania pluginu.
3. Zalogowany Jellyfin Web ma przycisk misioflix.
4. Po kliknięciu widoczne są dwie niezależne wyszukiwarki.
5. Po dodaniu bibliotek NFO anime jest prezentowane inaczej niż źródła gatunków filmów.
6. Oryginalny ekran odtwarzania działa normalnie po wyjściu z misioflix.

Jeśli etap 2–6 nie przechodzi, nie przechodź do natywnych aplikacji. Sprawdź logi
Jellyfin i zrezygnuj z wtyczki zgodnie z `INSTALACJA_UGREEN.md`.

## v0.4.81.0

- Testy tytułów nadrzędnych wyłącznie z tvshow.nfo/movie.nfo i niezależnego dopasowania sezonów z season.nfo.
- Testy automatycznego ładowania wyników wyszukiwarek w porcjach 30 i katalogu Kolekcje po 24 BoxSet.
- Brak ingerencji w natywne strony bibliotek Jellyfina.

## v0.4.82.0

- Testy `library_scroll_082.cjs` i `test_library_scroll_082.py`: rozpoznawanie tras bibliotek, licznika 1-100 z 602 / 101-200 of 602, tylko dozwolone biblioteki, API z paginacją, weryfikacja kolejności, zachowanie React-owned DOM i poprawne wstrzykiwanie assetów.
- Zestaw istniejących testów wyszukiwarek, kolekcji, MAL/Simkl i szczegółów wciąż działa.
- Rzeczywisty infinite scroll na działającym Jellyfinie 12.4 musi zostać sprawdzony po publikacji.

## v0.4.83.0

- Test `library_scroll_paging_083.cjs`: dokładnie jeden StartIndex i Limit w zapytaniu, ponowne użycie natywnych parametrów i weryfikacja kolejnych offsetów.
- Test `test_library_paging_083.py`: zabezpieczenie przed ponowną pierwszą stroną i zachowanie dotychczasowych wyszukiwarek.
- Testy starszych wersji zaktualizowane do numeru źródeł v0.4.83.

## v0.4.84.0

- Test regresji `library_card_posters_084.cjs`: rzeczywiste obrazy `<img>` z nowym item ID, brak starych liczników, poprawne linki i most do kolejki metadanych, bez zmiany paginacji.
- Test `test_library_covers_084.py`: brak ingerencji w siatkę React, kontrola selektorów i wersji.
- Test lokalny Chromium/Playwright na syntetycznym fragmencie struktury karty Jellyfin 12.4: nowy obraz, typ ANIME, link, opis, łapki 2/24 i gatunki z przykładowych metadanych.

## v0.4.85 — ręczne „Następny” jako obejrzany w Jellyfinie
- 387 testów Python + 36 podtestów (przejście po aktualizacji oczekiwanej wersji) — OK.
- 36 skryptów testowych JavaScript, w tym 8 asercji nowej akcji NEXT — OK.
- Front-end nie przechwytuje samodzielnego automatycznego przejścia, Stop ani Seek.
- Serwer czeka na potwierdzone sąsiadujące przejście; zapis `MarkPlayed(User)` jest w Jellyfinie.
- Nie wykonano kompilacji .NET 10 i integracyjnego testu na NAS-ie.
