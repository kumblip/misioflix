# Instalacja MisioFlix Native v0.4.10.0

Jest to **paczka źródłowa do GitHub Actions, nie plik DLL do ręcznego instalowania**.

1. Zrób kopię katalogu konfiguracji wtyczki na NAS. Nie zmieniaj NFO ani katalogów mediów.
2. Rozpakuj ZIP i prześlij jego pliki do katalogu głównego `https://github.com/kumblip/misioflix`, zachowując ścieżki w `src/`, `tests/`, `tools/` i `.github/workflows/`. Nowe `tests/test_v0410.py` i `tests/ui_v0410.cjs` zastępują testy UI poprzedniej wersji; w repozytorium usuń przestarzałe `tests/test_v049.py` oraz `tests/ui_v049.cjs` jeśli pozostały, aby nie uruchamiać testów sprawdzających stary numer wersji. Pozostałych plików repozytorium nie kasuj.
3. W `Actions` uruchom build lub poczekaj na build po commicie. Wynik musi być zielony. Workflow sam instaluje `postcss@8` do kontroli CSS.
4. Dopiero po udanym buildzie uruchom workflow Release z zatwierdzeniem `PUBLIKUJ`. Sprawdź publikację `v0.4.10.0` i `manifest.json`.
5. W panelu Jellyfin wybierz **Wtyczki → Katalog → MisioFlix**, zainstaluj `0.4.10.0`, a po potwierdzeniu instalacji uruchom ponownie wyłącznie kontener Jellyfin. Przeglądarka: `Ctrl+Shift+R`.
6. Test: kliknięcie plakatu, szczegóły i odtwarzacz Jellyfin; wygląd anime w `AnimePL — ostatnio dodane`; opisy z NFO; sekcja resume; mobilny widok. Sprawdź na użytkowniku z oceną i bez oceny.

## Dlaczego nie zawsze widać prawidłowy plakat?

W zależności od zawartości biblioteki Jellyfin karta może używać ilustracji `Thumb` albo pliku `Primary`. MisioFlix potrafi preferować obraz `Primary` dla widocznej karty, **tylko gdy serwer potwierdza jego istnienie**. Gdy nie ma plakatu, zachowuje obraz oryginalny; poziome miniatury odcinków nie są sztucznie rozciągane.

## Ważne

Nie instaluj równolegle Netflin ani dodatkowego CSS w panelu Jellyfin, bo style mogą się kłócić. Nie używamy osobnej strony pod portem 8097 ani 8098. Wtyczka wykorzystuje oryginalny odtwarzacz Jellyfin na 8096.
