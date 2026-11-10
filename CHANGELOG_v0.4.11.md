# MisioFlix Native 0.4.11.0 — naprawa pionowych plakatów po powrocie na główną

- Naprawiono znikanie pełnych plakatów po kliknięciu logo Jellyfin i powrocie do `#/`.
- Jellyfin potrafi ustawić `Thumb` później, już po pierwszym wzbogaceniu karty z cache; wtyczka obserwuje teraz późne ustawienie obrazu i przywraca istniejący `Primary` tylko tam, gdzie potwierdzono jego istnienie.
- Różne ścieżki otwarcia strony (`#/home`, `#/`) korzystają z tego samego motywu, bez drugiego katalogu i bez nowej nawigacji.
- Zabezpieczenie przed recyklingiem tego samego elementu `.card` dla innego ID podczas przechodzenia po bibliotece.
- Zachowane oryginalne elementy, kliknięcia, odtwarzacz, NFO i MAL.
- Brak dodatkowych pobrań metadanych pełnej biblioteki.

Wymagana kompilacja GitHub Actions i sprawdzenie na rzeczywistym Jellyfin 12.4.
