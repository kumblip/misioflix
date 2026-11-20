# MisioFlix Native v0.4.111.0 — propozycje ON i podgląd informacji na kafelkach

Bazą jest **scalone v0.4.110.0**, zawierające sortowanie propozycji, pełne listy gatunków i dwa natywne wpisy menu administratora Jellyfin.

## 1. Propozycje na stronie głównej — domyślnie włączone

- „Propozycje” domyślnie **ON**; przycisk na wejściu ma napis „Ukryj propozycje”.
- „Biblioteki” nadal domyślnie **OFF**.
- „Uwzględnij anime” nadal domyślnie **ON**.
- Zmiana jest prezentacyjna. Zapisane ustawienia gatunków na serwerze nie są modyfikowane.
- Po otwarciu strony głównej automatycznie rozpoczyna się ładowanie skonfigurowanych propozycji. Jeśli nie skonfigurowano żadnych propozycji, nie pobiera się katalogu propozycji.

## 2. Podgląd informacji „i” obok tytułu

W każdym **kafelku generowanym przez MisioFlix** (strona główna, biblioteki, propozycje, pełne listy gatunków, kolekcje, wyszukiwanie) po prawej od tytułu jest mały przycisk **„i”**.

Podgląd pokazuje:

- **Pełną nazwę tytułu**, bez ucinania do dwóch linii.
- **Pełny opis** z aktualnego, autoryzowanego źródła Jellyfin lub NFO.
- **Wszystkie gatunki** dostępne w danych kafelka (nie tylko trzy wyświetlane na plakacie).
- **„Zamknij”** — powrót do miejsca, w którym był użytkownik.
- **„Otwórz”** — przejście do oryginalnego, natywnego widoku szczegółów w Jellyfinie.

Podgląd jest **tylko do odczytu**, niczego nie zapisuje w MAL/Simkl ani Jellyfinie i nie potrzebuje dodatkowych zapytań na kliknięcie. Zamykany też przez Esc i kliknięcie poza panelem. Obejmuje wspólny renderer kafelków `makeCard`, nie ingeruje w natywne karty innych części Jellyfina.

## Bezpieczeństwo regresji

Nie zmieniono:

- wyświetlania plakatu, istniejących ramek statusu i łapek,
- odtwarzania i strony szczegółów,
- konfiguracji list gatunków, trybu AND/OR i kolejności zestawów,
- integracji i synchronizacji MAL/Simkl,
- danych ani plików NFO,
- obecnych stron administratora i rejestracji menu,
- GitHub Actions i mechanizmu budowania.

## Weryfikacja

- **486 testów Python — PASS**
- **56 skryptów Node.js — PASS**
- **Chromium desktop i wąski ekran mobilny — PASS**: pięć gatunków, pełna nazwa/tekst, Zamknij/Esc/Otwórz, brak błędów JS.
- **.NET 10 kompilacja — nie wykonywana lokalnie**.
- **Test na działającym NAS/Jellyfin — nie wykonywany**.
