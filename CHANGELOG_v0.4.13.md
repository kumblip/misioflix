# MisioFlix Native v0.4.13.0

- **Nowe:** przewijanie karuzel katalogowych przeciągnięciem plakatu myszką lub rysikiem.
- **Dotyk:** gest przesunięcia palcem obsługuje natywny przewijany kontener, z zachowaniem przewijania strony w pionie.
- **Bez przypadkowego uruchomienia:** przeciągnięcie blokuje kliknięcie; krótki klik otwiera oryginalny ekran szczegółów Jellyfin.
- **Automatyczne kolejne strony:** gdy przewijanie dobiega końca, pobierana jest następna partia w tej samej bibliotece.
- Strzałki, suwak i losowanie pozostały; brak zmian w NFO, MAL, Dockerze, bazie danych i API.
- Dalsze udoskonalenie interakcji v0.4.12, bez tworzenia dodatkowej strony.

Testy lokalne: Python unittest, Node syntax, Chromium desktop drag/click, Chromium mobile swipe (symulacja).
Niezależna kompilacja i test na NAS pozostają do potwierdzenia.
