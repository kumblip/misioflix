# MisioFlix Native v0.4.101.0 — ramki w „Sugerowanych”

Wydanie oparte **wyłącznie na pełnym kodzie v0.4.100.0**. Zachowuje wyszukiwarkę z cache, optymalizacje NFO, liczniki kolekcji, cache JS/CSS i wszystkie funkcje wcześniejszych wydań.

## Jedyna zmiana działania

- W sekcji „Sugerowane” na stronie szczegółów (`#itemDetailPage #similarCollapsible .similarContent`), dla kart z potwierdzonym statusem obejrzenia (`data-mf-watch="watched"` lub `data-mf-simkl-watch="watched"`/`"mixed"`) dodatkowy dekoracyjny różowy obrys `.cardBox` ma przezroczysty kolor. Zostaje właściwa zielona lub dwukolorowa ramka stanu oglądania na plakacie.
- Nieobejrzane i rozpoczęte pozycje zachowują dotychczasowe ramki.
- Zmiana ogranicza się do CSS: nie modyfikuje DOM, zdarzeń, statusów Jellyfin/MAL/Simkl ani innych sekcji, także przy najechaniu kursorem.

## Numeracja i wydawanie

- `meta.json` i `.csproj` — wersja `0.4.101.0`.
- Oryginalne `tools/sync_version.py`, `tools/package.py`, `.github/workflows/build.yml` oraz `release.yml` pozostają **niezmienione**.
- Żadnych nowych skryptów instalowania, wersjonowania lub publikowania.

## Ograniczenia

Testy automatyczne nie zastępują sprawdzenia wyglądu na prawdziwym Jellyfinie. Nie wykonano lokalnej kompilacji .NET 10 (SDK niedostępny), ani testów z działającym NAS/Tailscale. Potwierdź wynik GitHub Actions i sprawdź „Sugerowane” dla kont Jellyfin/MAL/Simkl.
