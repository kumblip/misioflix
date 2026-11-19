# MisioFlix v0.4.103.0 — wdrożenie

1. Jeżeli repozytorium jest dokładnie w stanie v0.4.102.0, wgraj zawartość ZIP `TYLKO_ZMIANY_OD_102` do katalogu głównego repozytorium, zachowując oryginalne ścieżki.
2. W przeciwnym razie użyj pełnych źródeł v0.4.103.0 po sprawdzeniu ewentualnych nowszych zmian.
3. Uruchom dotychczasowy workflow `build`, a po jego sukcesie `release` — bez dodatkowych skryptów.
4. Zrestartuj Jellyfin i wykonaj pełne odświeżenie strony w przeglądarce (np. Ctrl+F5). Upewnij się, że zainstalowana wersja to `0.4.103.0`.
5. Otwórz szczegóły anime i sekcję **„Więcej podobnych”**. Sprawdź na rzeczywiście nieobejrzanych, rozpoczętych, ukończonych i ponownie oglądanych pozycjach, czy mają odpowiednio różową, złotą, zieloną i złoto-zieloną ramkę wokół plakatu.

Jeżeli problem pozostaje, sprawdź w narzędziach przeglądarki na błędnej karcie wartości `data-mf-watch`, `data-mf-mal-frame`, `data-mf-simkl-watch`. Status `unknown` oznacza, że wtyczka nie ma jeszcze autorytatywnego statusu MAL, i kolor nie powinien być zgadywany na podstawie Jellyfina.

Inne sekcje, statusy źródłowe oraz mechanizm wydawania pozostają bez zmian.
