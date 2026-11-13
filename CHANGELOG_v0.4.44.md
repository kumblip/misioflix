# MisioFlix Native v0.4.44.0 — różowa ramka plakatu w szczegółach anime i sezonu

## Poprawka
- W sprawdzonym anime/sezonie, którego użytkownik nie dodał do MyAnimeList, API może zwrócić `entry: null` lub pominąć właściwość `entry`. Poprzednia wersja rozpoznawała jako „nieobejrzane” tylko pierwszą postać. Teraz obie otrzymują różową ramkę **głównego plakatu w szczegółach**.
- Zielona (`completed`) i złota (`watching` / `on_hold`) ramka pozostają bez zmian; podobnie ramka różowa dla `plan_to_watch` / `dropped`.
- Błędy odczytu, brak połączenia i niezweryfikowane anime nie otrzymują arbitralnie różowej ramki. Stan „nieobejrzane” jest nadawany wyłącznie po pomyślnym zweryfikowanym odczycie MAL.

## Bez zmian
- Panel MAL nadal jest widoczny tylko dla anime — zachowana poprawka v0.4.43.
- Wszystkie inne funkcje, pliki stylów, odtwarzanie, NFO, API, biblioteki i workflow bez zmian.
- Numer wersji: `meta.json` i `.csproj`; manifest publikacyjny nadal aktualizuje istniejący workflow przy wydaniu.

## Testy regresyjne
- Brak wpisu MAL w postaci `null` i brak pola `entry` (`undefined`) na pełnym plakacie.
- Zachowanie stanów złotego i zielonego oraz filtracja panelu przy filmach spoza anime.
