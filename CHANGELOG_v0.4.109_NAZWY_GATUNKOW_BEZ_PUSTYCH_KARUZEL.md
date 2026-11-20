# MisioFlix Native v0.4.109.0 — propozycje bez numeracji i pustych karuzel

Baza: **v0.4.108.0 z poprawką CI usuwającą zależność testów od `lxml`**.

## Zmiany na stronie głównej

- Tytuł karuzeli wyświetla **tylko nazwę wybranego gatunku lub połączenie gatunków**, bez prefiksu `Propozycja N:`. Dla trybu wszystkie gatunki (AND) stosowany jest separator ` + `, a dla trybu co najmniej jeden (OR) ` / `.
- Jeśli zestaw ma **zero kandydatów** po zastosowaniu filtrów i przełącznika „Uwzględnij anime”, jego sekcja **nie jest tworzona** — bez nagłówka, komunikatu ani pustej przestrzeni.
- Jeśli wśród kandydatów Jellyfin **nie zwróci żadnych dostępnych kart** po wyczerpaniu stron, cała sekcja jest ukrywana, a nie zastępowana komunikatem „Brak dostępnych pozycji”.
- Błąd pobierania to osobny przypadek — przycisk „Spróbuj ponownie” pozostaje dostępny, nie jest traktowany jak pusty gatunek.
- Jeśli żaden zestaw nie ma kandydatów, po sekcji przełączników nie pojawia się pusty blok ani komunikat o braku propozycji.

## Bez zmian

- Konfiguracja i zapis zestawów w panelu wtyczki, w tym nazwy „Propozycja 1”, „Propozycja 2” potrzebne administratorowi do rozróżnienia zestawów.
- Tryby AND/OR, „Uwzględnij anime”, domyślne „Losuj”, „Ostatnio dodane”, paginacja po 12 i doładowywanie.
- Plakaty, łapki, ramki MAL/Simkl, uprawnienia Jellyfin, odtwarzanie, NFO, katalogi `anime` / `animelektor`, inne karuzele i GitHub Actions.

## Testy

Uruchomiono pełny oryginalny zestaw CI oraz nowe regresje: **475 testów Python i 53 skrypty Node.js — PASS**.

Wersja wtyczki: `0.4.109.0`. Kompilacja .NET 10 i weryfikacja na uruchomionym Jellyfinie nie były możliwe lokalnie.
