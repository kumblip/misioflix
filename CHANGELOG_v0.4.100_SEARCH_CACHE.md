# MisioFlix v0.4.100.0 — wydajność wyszukiwarki

Bazowa wersja: **0.4.99.0** (fail-closed; nie aktualizuj starszego v0.4.94).

1. Pozostawienie cache katalogów w RAM podczas przechodzenia między podstronami SPA.
2. IndexedDB: lokalny cache katalogu wyszukiwania oddzielony wg serwera, użytkownika i schematu.
3. Szybkie otwarcie ze snapshotu i odświeżanie sieciowe w tle starszych zapisów.
4. Dotychczasowy przycisk odświeżenia pomija cache i wymusza sieć.
5. Poprawne zachowanie wpisanej frazy, filtrów i przewijania podczas aktualizacji.
6. Czyszczenie snapshotów po wylogowaniu; nie zapisuje tokenów użytkownika.
7. Fallback bez IndexedDB i testy kontraktów wyszukiwania.

**Zmiany objęte zakresem:** tylko `home.js`, `meta.json` i test `tests/current/search_catalog_cache_100.cjs`.
Brak zmian w kontrolerach, backendzie, NFO, obrazach, statusach MAL/Simkl i odtwarzaczu.
