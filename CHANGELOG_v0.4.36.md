# MisioFlix Native v0.4.36.0 — liczniki MAL (poprawka serwera)

## Przyczyna błędu
1. `MalEntry` serwera zwraca `episodes_watched` i `times_rewatched`, ale klient nie odczytywał tych konkretnych nazw.
2. Zbiorcze `users/@me/animelist?fields=list_status` może nie przekazywać wszystkich rozszerzonych liczników.
3. `ReadEntry` zastępował brakujące liczniki zerami, co było mylącą informacją.

## Zmiany
- `/MisioFlix/api/mal/item` pobiera kompletny `my_list_status` dla **jednego** MAL ID przez `/anime/{id}?fields=my_list_status` (weryfikacja autoryzacji i MAL ID z NFO bez zmian).
- Oddzielny cache szczegółów na jednego użytkownika Jellyfin i jeden MAL ID, TTL 1 godzina, współdzielone blokady i świadome odświeżenie na żądanie.
- Brak licznika staje się `null`, nie `0`.
- Klient rozpoznaje także serializowane nazwy C# `episodes_watched`, `times_rewatched`.
- Cache lokalny danych MAL v2, żeby usunąć stary niepełny wynik bez kasowania tokenów lub ustawień.
- Po ręcznym zapisie aktualizowany jest pełny wpis; awaria dodatkowego odczytu nie maskuje udanego PATCH.
- Wylogowanie/ponowne połączenie unieważnia cache szczegółów.
- Zaktualizowano testy wersjo-agnostyczne i dodano test dokładnego formatu obiektu serwerowego.

## Bez zmian
OAuth, Client Secret, NFO, ramki, układ, odtwarzacz, konfiguracja bibliotek, GitHub Actions.

## Weryfikacja
143 testy Python i 1 test Node w dostępnej bazie testowej: OK. Składnia JavaScript: OK. Kompilacja DLL i prawdziwe zapytania MAL wymagają uruchomienia na GitHub Actions/NAS.
