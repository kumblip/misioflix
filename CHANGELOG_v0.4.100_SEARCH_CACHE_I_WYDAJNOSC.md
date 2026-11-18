# MisioFlix Native v0.4.100.0 — szybkie wyszukiwanie i bezpieczne usprawnienia

Wydanie łączy wcześniejsze propozycje 0.4.100 (Search Cache) i 0.4.101 (Performance) w jedną wersję 0.4.100.0, opartą bezpośrednio na 0.4.99.0.

- Wyszukiwanie: cache katalogu pomiędzy otwarciami oraz po ponownym uruchomieniu przeglądarki (IndexedDB), rozdzielony według serwera/użytkownika, z odświeżaniem danych w tle i ręcznym odświeżeniem.
- Dane NFO: cache tylko prawidłowo sparsowanych plików, ponowny odczyt po zmianie daty modyfikacji lub rozmiaru pliku.
- Liczniki kolekcji: odpytywanie najwyżej 3 kolekcji równolegle, bez utrwalania liczników pomiędzy żądaniami; uprawnienia użytkownika zachowane.
- Zasoby JS/CSS: 7-dniowy cache wyłącznie dla URL ze zgodną wersją DLL; pozostałe zachowują dotychczasowe nagłówki.

Bez ingerencji w: MAL, Simkl, API Resume, odtwarzanie, kolekcje/NFO na dysku, DOM, wygląd kafelków i kompresję plakatów.

Zachowane natywne narzędzia: `tools/sync_version.py`, `tools/run_tests.py`, `tools/package.py`, `release.yml` i `build.yml`.

Uwaga: odświeżenie w tle może przez krótki czas pokazywać zapisany katalog podczas uzyskiwania najnowszych danych. Test integracyjny na NAS-ie pozostaje konieczny.
