# MisioFlix Native v0.4.29.0 — nawigacja banera

## Poprawione
- Przyciski bibliotek w banerze strony głównej (`AnimePL`, `Filmy ENG`, `Filmy PL`, `Seriale Animowane PL`, `Seriale PL`) ponownie otwierają właściwe podstrony.
- Usunięto regresję v0.4.28, w której obsługa `pointerdown` rozpoznawała własny `<nav>` jako zewnętrzny pasek Jellyfin i usuwała link zanim przeglądarka wykonała jego kliknięcie. Pozostawał pusty `#/home`.
- Linki w nagłówkach karuzel zachowują zwykłą nawigację.

## Bez zmian
- Lista kolekcji i jej przycisk w banerze, karuzela kolekcji pod AnimePL, paginacja.
- Ulubione `#/home?tab=1`, odtwarzacz, wznowienie, rozdzielone gatunki i wyszukiwarki.
- Wyłączenie grupowania filmów w kolekcje; NFO i pliki multimediów.
- `.github/workflows/build.yml` oraz `release.yml` — brak zmian.

## Sprawdzenie
- Test powtórzył błąd v0.4.28 w Chromium: `Filmy ENG` pozostawały pod `#/home` po kliknięciu.
- Po poprawce w Chromium wszystkie pięć bibliotek przechodzi do właściwego adresu, działa lista Kolekcje i natywna karta Ulubione.
- Test wykonano na izolowanym modelu DOM Jellyfin, nie na NAS-ie.
