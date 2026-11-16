# MisioFlix Native v0.4.79.0

## Nawigacja i widoki
- Kliknięcie `← Wstecz` oraz przełączanie sezonów przewija do góry także zawartość przewijaną przez SPA Jellyfina. Krótkie ponowienia zapobiegają przywróceniu starej pozycji po zmianie hash-route.
- Przełącznik sezonów (`S01`, `S02`, ...) jest nad natywną listą odcinków i działa w anime oraz zwykłych serialach; pobiera wyłącznie sezony danego `SeriesId`.
- W sezonach anime nagłówek ma postać `ANIME › tytuł (Typ)`, gdzie typ pochodzi z NFO. Zmiana nagłówka nie dotyczy zwykłych seriali.
- Zmniejszono wyłącznie font tytułu szczegółów anime, zwykłych seriali, filmów i kolekcji. Pozostałe części widoków są zachowane.

## Sprawdzanie aktualizacji — poprawa v0.4.78
- Naprawiono odczyt pól JSON przy obu wariantach nazewnictwa `InstalledVersion` / `installedVersion` (analogicznie GitHub, manifest, ABI i data). W starym panelu powodowało to `Nieznana` i puste wersje mimo prawidłowej odpowiedzi API.
- Dodano niezależny odczyt rzeczywistej zainstalowanej wersji przez administracyjne API Jellyfin `GET /Plugins`.
- „Wymuś pobranie aktualnego katalogu” odświeża URL **wyłącznie repozytorium MisioFlix** przez natywne `POST /Repositories`, a potem odczytuje status i `GET /Packages`. Pozostałe repozytoria zachowują adres i stan. Brak cichego modyfikowania plików DLL.
- Wymuszenie ponownie odczytuje dane nawet jeśli odświeżenie URL katalogu zawiedzie; pokazuje konkretny błąd źródła. Rozdzielono błędy GitHub/manifestu/katalogu.
- Działa porównanie identycznych wersji, wyświetlana jest data kontroli i informacja `jest już zainstalowany`.
- Błąd API GitHub Releases nie blokuje instalacji, jeśli odpowiednia nowsza wersja ma poprawny ABI i została zgodnie potwierdzona w manifeście oraz katalogu Jellyfina; instalację nadal zleca wyłącznie autoryzowany endpoint Jellyfina, bez automatycznego instalowania.
- Zabezpieczenie przed nadpisaniem świeżych wyników przez spóźnione żądanie.

## Testy źródłowe
- 368 testów Python i 29 skryptów JavaScript, w tym test symulujący odpowiedź API PascalCase, małe litery, błąd GitHub, rzeczywiste wersje oraz wymuszone odświeżenie katalogu.
- Nie wykonywano testów integracyjnych na serwerze NAS ani kompilacji .NET DLL w tej sesji.
