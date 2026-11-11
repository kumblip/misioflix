# Wdrożenie naprawy MisioFlix v0.4.20

1. Zapisz istniejącą wersję wtyczki (np. paczkę ZIP v0.4.19), aby mieć możliwość powrotu.
2. Rozpakuj `MisioFlix_v0.4.20_Naprawa_Odtwarzania_GitHub.zip`.
3. Do repozytorium `kumblip/misioflix` w gałęzi `main` wgraj **zawartość archiwum**, zachowując ścieżki. Najważniejsze to `src/Jellyfin.Plugin.MisioFlix/Web/home.js`, `theme.css`, `meta.json` oraz pliki testów `tests/current/`.
4. Nie zmieniaj `.github/workflows/build.yml` ani `.github/workflows/release.yml` — poprawione workflow v0.4.19 pobierają wersję automatycznie z `meta.json`.
5. Uruchom GitHub Actions → **Build**. Po pomyślnej kompilacji pobierz wygenerowany artefakt `MisioFlix_0.4.20.0_JF12.4.zip` (to **paczka instalacyjna** Jellyfin, nie pliki źródłowe).
6. Po udanym teście możesz opublikować release v0.4.20.0 przy użyciu `release.yml` (zgodnie z istniejącym procesem). Aktualizuj wtyczkę w Jellyfin i zrestartuj kontener; następnie odśwież kartę przeglądarki z pominięciem cache (Ctrl+F5).

## Test na Jellyfin 12.4

- Kliknij **plakat**, następnie **tytuł** i pustą część karty „Oglądaj dalej” dla filmu i odcinka. Każde kliknięcie powinno uruchamiać natywny odtwarzacz Jellyfin, zachowując zapisany punkt wznowienia. Gdy Jellyfin nie udostępnia bezpośredniego API, na moment może wyświetlić stronę **konkretnego odcinka/filmu**, po czym samo kliknąć natywne `Wznów/Odtwórz`.
- Sprawdź, że **`i`** nadal otwiera informacje o całej serii/filmie.
- Sprawdź, że `×`, `Przywróć`, `Usuń` i ich rozdzielone zachowania nadal działają.
- Sprawdź odtwarzanie obrazu i dźwięku, ponieważ wtyczka musi zachować izolację własnego CSS w trakcie odtwarzania.

**Jeżeli strona odcinka nadal pozostanie otwarta:** sprawdź w DevTools → Console komunikat `[MisioFlix] Odtwarzanie nie uruchomiło się` i prześlij zrzut strony odcinka z widocznym przyciskiem Odtwórz/Wznów; pozwoli to dopasować selektor dla konkretnego wydania Jellyfin Web bez zgadywania.

Nie trzeba kompilować niczego na NAS-ie. W tym środowisku wygenerowano wyłącznie źródła GitHub; gotowe DLL tworzy GitHub Actions.
