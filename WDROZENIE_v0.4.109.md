# MisioFlix v0.4.109.0 — instrukcja wdrożenia

Jeśli repozytorium zawiera **v0.4.108.0 z naniesioną poprawką CI**, wgraj zawartość paczki `MisioFlix_Native_v0.4.109_TYLKO_ZMIANY_OD_108_CI.zip`, zachowując strukturę katalogów.

Jeśli wersja repozytorium jest niepewna, użyj pełnych źródeł `MisioFlix_Native_v0.4.109_GitHub_PELNE.zip` po przejrzeniu ewentualnych zmian nowszych niż baza.

Uruchom dotychczasowy workflow `build`, a po powodzeniu `release`. Oczekiwany tag: `v0.4.109.0`. Nie trzeba instalować `lxml`, zmieniać GitHub Actions ani konfigurować ustawień propozycji od nowa.

Po instalacji zrestartuj Jellyfin, otwórz stronę główną, włącz „Pokaż propozycje” i sprawdź: nagłówki gatunków bez numerów, brak pustych pozycji dla Isekai/Villainess itd. (jeżeli po aktualnych filtrach nie ma wyników), a przy obecnych tytułach te same plakaty i przyciski „Losuj/Ostatnio dodane”.
