# Wdrożenie MisioFlix v0.4.78.0

1. Wgraj zawartość **pełnej paczki źródłowej** do katalogu głównego `kumblip/misioflix`, zachowując katalogi `src/`, `tools/`, `tests/`, `.github/`, plik `meta.json` itd. Nie rozpakowuj ZIP-a instalacyjnego jako źródła.
2. Uruchom dotychczasowy **GitHub Actions build**. Numer wydania jest ustalany z `meta.json`; ręcznie nie zmieniaj workflow.
3. Po zielonym buildzie użyj zatwierdzonego procesu **Release** (`PUBLIKUJ`), który tworzy paczkę instalacyjną, dodaje release i aktualizuje `manifest.json`.
4. Sprawdź, że Jellyfin ma dodane aktywne repozytorium: `https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json`.
5. Otwórz panel **Administracja → Wtyczki → MisioFlix → Aktualizacje MisioFlix**; naciśnij `Wymuś sprawdzenie aktualizacji`, aby porównać GitHub, manifest i katalog Jellyfin.
6. Dopiero gdy panel potwierdzi zgodną wersję w katalogu Jellyfin i aktywuje przycisk instalacji, można zlecić **Zainstaluj aktualizację**. Jeśli nowy GitHub Release jeszcze nie ma wpisu w manifeście, napraw publikację manifestu / odczekaj propagację, zamiast kopiować DLL ręcznie.
7. Zrestartuj Jellyfin, jeśli wymaga tego instalator. W przeglądarce wykonaj `Ctrl+Shift+R`.

**Bezpieczeństwo:** panel nie edytuje Jellyfin Web i nie pobiera własnego DLL z GitHuba. Instalację wykonuje natywny endpoint Jellyfina, wymagający uprawnień administratora. Aktualizacja nie jest automatycznie instalowana.

**Testy ręczne:** zweryfikuj na anime i serialu: ekran odcinka → rodzicielski sezon → cała seria → strona główna, oraz pasek `S01`,`S02` z wyróżnionym sezonem. Sprawdź na filmie `Wstecz` → strona główna.
