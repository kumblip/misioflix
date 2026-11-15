# MisioFlix Native 0.4.67.0 RC — natywna struktura DOM bez przenoszenia

## Powód
Log użytkownika (Jellyfin Web 12.4.0, v0.4.66) powiązał błędy `addScrollEventListener` i `removeScrollEventListener` z `details.js → restoreLayout()/ensureLayout()`. Mechanizm fizycznie przenosił duże natywne komponenty Jellyfina, wyzwalając `attachedCallback` i `detachedCallback` starego systemu webcomponents. Po drugiej próbie natywny kod zgłosił dodatkowo `Cannot read properties of undefined (reading 'show')`, którego źródło wymaga weryfikacji na działającym Jellyfinie.

## Zmiana
- `details.js`: całkowite wyeliminowanie reparentingu istniejących natywnych elementów (brak `relocate`, `appendChild`/`replaceWith` dla elementów Jellyfina). Oryginalne `detailImageContainer`, `detailRibbon`, `detailPagePrimaryContent`, `detailPageSecondaryContainer`, odcinki i obsada pozostają u rodziców Jellyfina.
- `theme.css`: układ szczegółów jako CSS Grid poprzez `display: contents` dla istniejącego kontenera pierwszoplanowego; nowy pasek plakatu i przyciski należą tylko do MisioFlixa. Osobne pozycjonowanie mobile; obsada zwijana bez przenoszenia list przewijanych.
- `mal-frames.css`, `simkl.css`: te same wizualne ramki wokół oryginalnego plakatu w nowym układzie; logika MAL i Simkl niezmieniona.
- `recoverNativeMetadataEdit`: wstrzymuje wyłącznie własny observer na czas edytora. Nie zmienia DOM i nigdy nie przechodzi do `#/metadata`.
- Zaktualizowane testy regresji w zakresie zabronionych mutacji DOM i wersji.

## Ograniczenia
Testy statyczne i przeglądarkowe mogą sprawdzić brak odłączania natywnych elementów w makiecie. Nie stanowią potwierdzenia, że błąd `undefined.show` z natywnego kodu Jellyfina ustąpi na NAS-ie. v0.4.64.0 pozostaje zatwierdzonym stabilnym checkpointem.
