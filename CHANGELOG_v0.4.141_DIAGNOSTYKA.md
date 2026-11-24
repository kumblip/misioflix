# MisioFlix 0.4.141.0 — diagnostyka wydajności (kandydat)

Baza: pełne źródła z przekazania 0.4.140.0 (519 plików). Checkpoint 0.4.139.0 STABLE pozostaje bez zmian. Numer kandydata należy porównać ze zdalnymi tagami przed publikacją.

## Zmiany
- Nowa, domyślnie zamknięta sekcja „Diagnostyka wydajności” w ustawieniach administracyjnych. Włącz/wyłącz, odśwież, reset i eksport JSON. Oddzielne wyniki serwera i bieżącej karty przeglądarki.
- Serwer: osiem jawnie wybranych, istniejących akcji API (katalog, lista bibliotek, karuzele pojedyncze i batch, kolekcje, karty i gatunki propozycji, Oglądaj dalej). Pomiar czasu akcji (bez serializacji HTTP i sieci), licznik błędów akcji. Endpointy odczytu i sterowania wymagają `Policies.RequiresElevation`; `private, no-store`.
- Klient: czas sieci i JSON dla katalogu, przygotowanie propozycji do zbudowania szkieletów, synchroniczna zmiana filtrów, renderowanie kart, czas pobrania kart propozycji (pełne trafienie cache / pełne chybienie bez współdzielonego żądania / pozostałe), Play/Resume do kliknięcia natywnego przycisku. Licznik błędów żądań Home i trafień/chybień cache kart; błędy serwera i klienta mogą opisywać to samo żądanie, nie sumować ich.
- W każdym przedziale pomiarowym 256 ostatnich próbek; liczba próbek, liczba pomiarów od resetu, średnia, maksimum i P95. Dane w RAM, bez identyfikatorów tytułów, kont, tokenów, URL, payloadów lub logowania do plików. Klient traci dane przy odświeżeniu, wyłączeniu, zmianie wykrytej sesji użytkownika/serwera; serwer przy restarcie lub wyłączeniu/resetowaniu. Serwer agreguje wszystkie konta, tylko administrator odczytuje wyniki. Wyłączenie serwera nie zmienia stanu pomiaru w innych otwartych kartach.
- Nie zmieniono CSS, limitu katalogu, kolejności filtrów, odtwarzacza, MAL/SIMKL, danych NFO, bibliotek, schematów konfiguracji ani workflow. Manifest historyczny pozostawiono do automatycznej aktualizacji przez istniejący workflow release.

## Weryfikacja
- `python3 tools/run_tests.py`: 593 Python + 70 skryptów Node (w tym 11 testów diagnostyki JS). Jedna istniejąca asercja liczby sekcji admin rozszerzona z 9 do 10, nadal sprawdza wszystkie poprzednie sekcje.
- `node --check` wszystkich JS Web oraz skryptu w configPage.html: PASS.
- Brak SDK .NET 10 w środowisku; testy C# tutaj tylko kontrakty źródłowe. Wymagane GitHub Actions build, test autoryzacji, smoke test NAS. Nie oznaczać STABLE na podstawie tych wyników.
