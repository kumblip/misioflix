# MisioFlix Native v0.4.43.0 — dwie poprawki MAL w szczegółach

## Naprawiono
1. **Główny plakat anime/sezonu**: po poprawnym odczycie MAL, gdy tytułu nie ma na liście użytkownika (`entry: null`), plakat otrzymuje **różową ramkę** (`unwatched`). Pozostałe stany są bez zmian: zielony = obejrzane, złoty = w trakcie. Błąd odczytu, brak połączenia i stan niezweryfikowany **nie są** zamieniane na różowy.
2. **Panel MyAnimeList wyłącznie dla anime**: zanim zostanie pokazany, kod sprawdza `anime === true` w istniejącym uwierzytelnionym `/MisioFlix/api/overlays`, który klasyfikuje po konfiguracji AnimeRoot, nie po gatunku ani nazwie. Na zwykłych filmach i serialach panel pozostaje niewidoczny również podczas wczytywania i w przypadku błędu rozpoznania.

## Bez zmian
- Wszystkie funkcje v0.4.42 poza powyższymi: odtwarzanie, wznawianie, widoki, wyszukiwarki, karuzele, biblioteki, NFO, statusy MAL, zapisy MAL, oceny i pozostałe ramki.
- Pliki `.github/workflows/build.yml` i `.github/workflows/release.yml` (wersja nadal jest odczytywana z `meta.json`).
- `manifest.json` zachowuje metadane opublikowanej wersji 0.4.42; workflow Release sam dopisze nową wersję i poprawną sumę kontrolną **dopiero po zbudowaniu DLL**.

## Testy
- Testy dla stanu null, stanu nieznanego, filtracji anime i braku widocznego panelu przed rozpoznaniem.
- Pełny zestaw `python3 tools/run_tests.py` oraz sprawdzanie składni JS.
