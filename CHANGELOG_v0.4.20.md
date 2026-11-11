# MisioFlix Native 0.4.20.0 — naprawa odtwarzania z „Oglądaj dalej”

## Potwierdzone zgłoszenie z v0.4.19

Kliknięcie karty w „Oglądaj dalej” przenosiło do szczegółów serii/odcinka zamiast uruchamiać wideo. W v0.4.19 powierzchnia plakatu i tytułu nadal składała się z linków `href` do `#/details`; natywna nawigacja Jellyfin mogła przejąć kliknięcie. Kod zapasowy otwierał stronę szczegółów bez próby rozpoczęcia odtwarzania.

## Zmiany

- Plakat `Oglądaj dalej` jest teraz przyciskiem odtwarzania zamiast linku, a tytuł jest tekstem. Kliknięcie dowolnej aktywnej powierzchni kafelka uruchamia `playResume`, a nie `#/details`.
- Zachowany oddzielny przycisk `i` prowadzący do głównej karty filmu lub całej serii.
- Odtwarzany jest identyfikator `resumeId` konkretnego filmu/odcinka, nie `item.id` nadrzędnej serii.
- Gdy dostępny jest klientowy `playbackManager`, żądanie używa natywnego odtwarzania z `startPositionTicks` i bez kierowania do zewnętrznego odtwarzacza.
- Dla Jellyfin Web, które nie udostępnia menedżera: krótka próba działania przez natywny `data-action`; w przypadku braku odtwarzacza otwarcie szczegółów **konkretnego wideo** i automatyczne naciśnięcie natywnego przycisku „Wznów/Odtwórz” po wyrenderowaniu strony.
- Kontrola wyniku zdarzenia: `defaultPrevented` samo w sobie nie oznacza odtwarzania.
- W razie braku przycisku wyświetlany jest komunikat zamiast pozostawiania użytkownika bez informacji.
- Zachowane: ukrywanie, przywracanie, usuwanie punktu wznowienia, karuzele, wyszukiwarki, ramki, 5 losowych pozycji, obie akcje Losuj/Ostatnio dodane, izolacja CSS w odtwarzaczu, menu administracyjne i workflow.

## Testy

- 55 testów Python oraz 2 skrypty Node (bez testów historycznych),
- test Chromium: kliknięcie plakatu uruchamia natywny przycisk dokładnego odcinka po fallbacku,
- test Chromium: dostępny `playbackManager` dostaje poprawny ID oraz `startPositionTicks` i nie przechodzi do szczegółów,
- test Chromium: `i` otwiera szczegóły serii, bez odtwarzania.

**Uwaga:** testy Chromium symulują odpowiedzi Jellyfin i natywne przyciski. Nie zastępują testu na NAS-ie. Ścieżka awaryjna może krótko pokazać stronę konkretnego filmu/odcinka przed startem wideo.

Wersja: `0.4.20.0`, zgodna docelowo z Jellyfin `12.4.0.0`.
