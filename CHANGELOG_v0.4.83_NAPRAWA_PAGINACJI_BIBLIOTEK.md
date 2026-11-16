# MisioFlix Native v0.4.83.0 — naprawa paginacji infinite scroll w bibliotekach

## Problem odtworzony na podstawie logów i DOM Jellyfin 12.4

Wersja 0.4.82 kopiowała natywne parametry `startIndex=0&limit=100` z zapytania API, a następnie dodawała wielkoliterowe `StartIndex=100&Limit=100`. Ponieważ parametry zapytania są traktowane bez rozróżniania wielkości liter, Jellyfin mógł ponownie zwracać pierwszą stronę. W logu widać żądania z dwoma wartościami offsetu. HTML pokazywał 100 kart w natywnej siatce, zero w dodatkowej siatce oraz licznik modułu `700 z 601`.

## Zmiany

- Jeden kanoniczny `StartIndex` i jeden `Limit` we wszystkich zapytaniach modułu (również we wstępnej weryfikacji sortowania).
- Zachowane filtry, sortowanie i `ParentId` oryginalnego żądania biblioteki.
- Sprawdzenie identyfikatorów pobranej strony względem wcześniej załadowanych pozycji; przy duplikatach bezpieczne wstrzymanie i dostępność natywnego stronicowania.
- Licznik offsetu zmienia się dopiero po dołączeniu faktycznie nowych kart. Informacyjny log przy udanym doładowaniu.
- Wyszukiwarki, Kolekcje, nawigacja, MAL i Simkl bez zmian.

## Ograniczenie odziedziczone po v0.4.82

Moduł nadal korzysta z **oddzielnej sekcji dodatkowych kart** pod siatką React Jellyfina. Nie jest to natywny React infinite scroll i nie zapewnia pełnego zestawu funkcji natywnych kart. W tej poprawce nie przebudowano tego mechanizmu, aby ograniczyć zmianę do błędu paginacji. Nie można uczciwie twierdzić, że nie dodaje elementów DOM.

## Weryfikacja

W testach regresyjnych sprawdzono żądania z oryginalnymi wartościami `startIndex` i `limit`, generowanie stron 101–200, 201–300 itd. oraz wykrywanie duplikatów. Nie przeprowadzono testu z działającym NAS/Jellyfin. Po instalacji wymagana jest weryfikacja pierwszego doładowania w przeglądarce.
