# MisioFlix Native v0.4.33 — poprawka testu Node

## Przyczyna

W `tests/current/ui_v0411.cjs` pozostały dwie asercje dotyczące statusu odtwarzania anime z Jellyfin. Od v0.4.33 dla anime autorytatywne są dane MyAnimeList zalogowanego użytkownika. Bez zweryfikowanego wpisu MAL stan powinien być `unknown`, nawet jeżeli natywny przycisk Jellyfin oznacza odtworzenie.

## Zmiana

Zmodyfikowane zostały wyłącznie dwa oczekiwania `data-mf-watch` w teście `tests/current/ui_v0411.cjs`:

- testowa karta anime `data-played=true` oczekuje `unknown`, a nie `watched`;
- testowa karta anime `data-played=false` oczekuje `unknown`, a nie braku atrybutu.

Pozostałe kontrole: struktura DOM, plakaty, overlay, linki, NFO, brak dodatkowych zapytań i brak nawigacji, są zachowane.

## Wdrożenie

1. Rozpakuj ZIP.
2. W istniejącym repozytorium nadpisz wyłącznie plik `tests/current/ui_v0411.cjs`.
3. Uruchom ponownie GitHub Actions → Build.

Nie zmieniaj `meta.json`, `build.yml`, `release.yml`, konfiguracji OAuth, plików MAL/NFO ani skompilowanej wtyczki. Wersja pozostaje `0.4.33.0`.

## Weryfikacja

Test `node tests/current/ui_v0411.cjs` przeszedł lokalnie z `client.js` dostarczonym w paczce v0.4.33. W dostarczonym logu GitHub wszystkie 155 testów Python i pierwszy skrypt Node przeszły wcześniej; pełny rerun na GitHub po wdrożeniu tej poprawki pozostaje do potwierdzenia.
