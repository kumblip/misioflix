# Wdrożenie MisioFlix Native v0.4.42.0

**Paczka jest aktualizacją częściową na działającą v0.4.41.** Nie usuwaj pozostałych plików repozytorium.

1. Rozpakuj ZIP i nadpisz pliki `meta.json`, `src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj` oraz `src/Jellyfin.Plugin.MisioFlix/Web/theme.css`. Dodaj test `tests/current/test_anime_search_mobile_0442.py`.
2. Zachowaj dotychczasowe `.github/workflows/build.yml` i `release.yml` bez edycji.
3. Uruchom **Build** w GitHub Actions, a następnie **Release** zgodnie z dotychczasowym procesem publikacji. Zainstaluj wygenerowaną wersję w Jellyfin i zrestartuj serwer, jeśli instalacja tego wymaga.
4. Na Androidzie zamknij i ponownie otwórz kartę Jellyfin lub wyczyść pamięć podręczną tej strony, jeśli wczytuje stare CSS.
5. Otwórz AnimePL i wyszukiwarkę anime. Sprawdź: trzy karty w rzędzie, jeden wiersz tytułu, zachowane łapki, ramki MAL, opisy i gatunki. Upewnij się, że wyszukiwarka filmów/seriali jest bez zmian.

**Testy lokalne:** asercje źródłowe oraz Chromium w szerokościach 320, 360, 390 i 750 px (bez instalacji DLL). Weryfikacja na Twoim NAS-ie pozostaje konieczna.
