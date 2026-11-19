# MisioFlix Native v0.4.103.0 — prawdziwa poprawka ramek w „Więcej podobnych”

Baza: pełna v0.4.102.0. Zachowano wszystkie poprzednie funkcje i optymalizacje.

## Dlaczego v0.4.101 i v0.4.102 nie pomogły

Poprzednie poprawki zmieniały obramowanie `.cardBox`, które otacza całą kartę. Tymczasem kolorowa ramka pokazywana na plakacie jest wytwarzana przez **`.cardScalable`/`.cardImageContainer` i ich pseudo-elementy**; MAL i Simkl mają dodatkowe niezależne warstwy. Dlatego obok zielonego obrysu mógł być widoczny również różowy.

## Korekta

Wyłącznie wewnątrz `#itemDetailPage #similarCollapsible .similarContent` w `Web/theme.css`:

- Zlikwidowano poprzedni blok rysujący ramki na całej `.cardBox` (i jego pseudo-element).
- Dla kart z już ustalonym stanem oglądania wyłączono nakładające się obrysy z `.cardScalable` i `.cardImageContainer`.
- Jedna warstwa `.cardScalable::after` rysuje ramkę **na plakacie**, nad grafiką, zgodnie z tym samym stanem użytkownika co w pozostałych bibliotekach.
- Stan pochodzi z dotychczasowych atrybutów MAL (`data-mf-watch`, `data-mf-mal-frame`) lub Simkl (`data-mf-simkl-watch`). Żadna baza ani logika statusów nie zostały zmienione.

Kolory: **różowy** = nieobejrzane, **złoty** = rozpoczęte, **zielony** = obejrzane, **złoto-zielony** = obejrzane + aktywne wznowienie (mieszany).

## Czego nie zmieniono

`client.js`, `mal.js`, `simkl.js`, `details.js`, `mal-frames.css`, `simkl.css`, odtwarzacz, NFO, backend C#, wyszukiwarka i GitHub Actions pozostają identyczne jak w v0.4.102. Nie ma nowego systemu budowania ani patchy Git.

## Weryfikacja

- Testy obecnych funkcji i nowe kontrole zakresu CSS.
- Kontrola przypisania wszystkich 8 kombinacji stanów MAL i Simkl do właściwych kolorów (lokalne dopasowanie selektorów CSS).
- Kompilację .NET 10 i efekt wizualny w działającym Jellyfinie trzeba jeszcze sprawdzić przy wdrożeniu.
