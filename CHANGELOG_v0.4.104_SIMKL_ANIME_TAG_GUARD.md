# MisioFlix Native v0.4.104.0 — Simkl wyłącznie dla pozycji bez tagu Anime

Baza: **v0.4.103.0**. Poprawka zamyka konflikt statusu MAL (zielony) z nieuprawnioną różową ramką Simkl widoczny w `Więcej podobnych` / `Sugerowane`.

## Zasada

- NFO `<tag>Anime</tag>` (bez rozróżniania wielkości liter), odpowiedni tag Anime zapisany w Jellyfin lub jawny element NFO `<anime>` oznacza **wyłączenie całej pozycji z Simkl**. Obowiązuje niezależnie od biblioteki, w której znajduje się produkcja.
- Zachowano istniejące wykluczenie pozycji z `AnimeRoot` (bez regresji w AnimePL).
- Zwykłe filmy, seriale i animacje **bez tagu Anime** zachowują aktualną integrację Simkl; samo słowo `Animacja`, gatunek lub nazwa nie oznaczają anime.
- Nie zmienia się statusów, ocen, list, integracji MAL, Jellyfin, NFO ani rzeczywistych plików multimedialnych.

## Naprawa źródłowa

1. `MisioFlixCatalogService.cs` — wspólna weryfikacja tagów Jellyfin/NFO i ścieżki dla operacji Simkl; uwzględnienie tagów także w niezależnym API szczegółów i zbiorczych kart. Istniejący bezpieczny cache parsowania NFO uwzględnia znacznik Anime i modyfikację pliku.
2. `MisioFlixSimklPlaybackHostedService.cs` — odtwarzanie oraz ręczna zmiana stanu w Jellyfin nie są przekazywane do Simkl dla produkcji oznaczonych Anime.
3. `MisioFlixSimklController.cs` — żądanie `card-scores` ujawnia tylko identyfikatory użytkownika zweryfikowane po stronie serwera jako uprawnione do ramek Simkl.
4. `client.js` i `simkl.js` — wykluczone anime nie otrzymuje lub traci stare klasy Simkl; pozostałe karty otrzymują obramowanie dopiero po potwierdzeniu uprawnień i klasyfikacji. Nie zmieniono znaczenia żadnego statusu.
5. `simkl.css` i `theme.css` — stare selektory Simkl nie mają zastosowania do rozpoznanych anime w `Więcej podobnych` ani do innych kart.
6. `home.js` — na stronę główną nie trafiają dekoracje Simkl dla pozycji wykluczonych przez tag.

## Ochrona pozostałych funkcji

- MAL i jego statusy oraz dwukolorowa ramka pozostają niezależne.
- Simkl dla zwykłych filmów/seriali/animacji nadal obsługuje oceny, historię i statusy.
- Zachowano kontrolę uprawnień użytkownika, rozdzielenie kont, istniejące narzędzia wydawnicze oraz workflow GitHub Actions.
- NIE zmieniono synchronizacji archiwów MAL/Simkl, renderowania odtwarzacza, bazy danych ani tagów NFO na dysku.

## Testy

- 461 testów Pythona oraz 45 skryptów Node.js — PASS.
- Nowy test JS odtwarza `anime+MAL watched+Simkl unwatched`, pozycję z tagiem Anime poza AnimeRoot oraz zwykłą animację, która pozostaje w Simkl.
- Nie wykonano kompilacji .NET 10 ani testu na działającym NAS/Jellyfin. Wydanie źródłowe wymaga zielonego GitHub Actions i sprawdzenia w przeglądarce.
