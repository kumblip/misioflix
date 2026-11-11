# MisioFlix Native 0.4.32.0 — MAL ID z NFO

## Poprawiono
- Błąd HTTP 404 w panelu MAL, gdy identyfikatory Jellyfin były porównywane jako różne zapisy GUID (`N` i `D`).
- MAL używa teraz `GET /MisioFlix/api/mal/resolve?catalogId=...&seasonId=...` — pojedynczego, ograniczonego do zalogowanego użytkownika wyszukiwania pozycji, bez przeglądania całego katalogu.
- Identyfikator MAL pochodzi wyłącznie z lokalnego NFO odczytanego na serwerze Jellyfin (`uniqueid type="mal"`), a nie z tytułu, MAL API ani z innych metadanych.
- Sezon używa własnego `season.nfo`, z kontrolą prawidłowej nadrzędnej serii.
- Jeśli seria nie ma MAL ID w NFO głównym, można odczytać ID z `season.nfo` **pierwszego sezonu** (S1); nie używa się losowego późniejszego sezonu.
- Podczas sprawdzania MAL ID można pominąć wcześniejsze NFO bez identyfikatora i sprawdzić kolejne poprawne NFO (np. `tvshow.nfo` → `season.nfo`).
- Błędy HTTP wyświetlają komunikaty serwera zamiast ogólnego „404 katalogu”.

## Nie zmieniono
- Logowania OAuth MAL, połączeń użytkowników, ich ocen, danych i tokenów.
- Oryginalnego odtwarzacza, list głównych, NFO w bibliotece ani reguł cache.
- `.github/workflows/build.yml` i `release.yml`.

## Kontrole
143/143 testów Python, 2/2 testy Node. Składnia JS sprawdzona przez Node. Nie kompilowano DLL ani nie testowano połączenia z rzeczywistym MAL/NAS.
