# MisioFlix Native v0.4.117.0 — mobilne natywne biblioteki w 3 kolumnach

## Przyczyna
W v0.4.116 poprawiono wewnętrzne odstępy kafelka, ale nie układ `.itemsContainer` oraz szerokości natywnych `.card` w mobilnych widokach bibliotek. Wciąż były dwie kolumny.

## Co zmieniono
- **Wyłącznie CSS dla wyglądu**: w `theme.css` dodano reguły `@media(max-width:680px)` dotyczące natywnego widoku biblioteki (`mf-native-library-route`).
- Obecne kafelki pozostają tymi samymi elementami Jellyfina; żadnych nowych, zastępczych ani ukrytych.
- Siatka CSS Grid: trzy kolumny; natywny Flex: szerokość 1/3 z uwzględnieniem dwóch przerw po 4px. **Nie zmieniono `display` kontenera**.
- Bez zmian: ramki MAL/Simkl, łapki, informacja „i”, dwuwierszowe tytuły, grafiki, filtry, sortowanie, paginacja i przewijanie.
- Strona główna i komputer nie są objęte nowymi regułami.

## Wdrożenie
Na bazie v0.4.116: nadpisz pliki z paczki zmian, następnie standardowe `build` i `release`, tag `v0.4.117.0`. Nowe wydanie wymaga aktualizacji wtyczki i odświeżenia zasobów strony (w razie starego CSS ponownie otwórz aplikację).

## Weryfikacja
Wyniki testów znajdują się w pliku `WDROZENIE_v0.4.117.md`. Końcowy widok należy sprawdzić w aplikacji Jellyfin na Androidzie/iOS, ponieważ to natywne środowisko ma osobną implementację układu.
