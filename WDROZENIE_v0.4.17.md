# MisioFlix v0.4.17.0 — wdrożenie i kontrola

1. Rozpakuj ZIP w głównym katalogu publicznego repozytorium `kumblip/misioflix` i wgraj pliki z zachowaniem ścieżek (`.github`, `src`, `tests`, `meta.json`). Nie usuwaj pozostałych plików projektu.
2. W GitHub Actions uruchom `build`. Sprawdź testy, kompilację .NET 10 i wygenerowanie artefaktu `MisioFlix_0.4.17.0_JF12.4.zip`.
3. Jeśli cały workflow przejdzie, uruchom `release` i wpisz `PUBLIKUJ`, publikując `v0.4.17.0`.
4. Zainstaluj wersję z katalogu wtyczek Jellyfin; po potwierdzonej instalacji zrestartuj wyłącznie kontener Jellyfin i odśwież przeglądarkę `Ctrl+Shift+R`.
5. Sprawdź, czy w obu wyszukiwarkach są zielone/czerwone/neutralne biblioteki i typy, czy gatunki są od razu rozwinięte oraz czy podpowiedzi mają plakaty, rok i liczniki.
6. Sprawdź jasnoróżowe/bursztynowe/zielone ramki. Jeżeli brak rozpoczętych pozycji w `Oglądaj dalej`, sprawdź w Jellyfin, czy dany odcinek ma zapisany `PlaybackPositionTicks` oraz czy API `/MisioFlix/api/home/resume` zwraca pozycje. Nie oznaczaj odcinków jako obejrzane na próbę.
7. **Czarny obraz:** najpierw odtwórz zwykły materiał H.264 oraz problematyczny plik i sprawdź w panelu administracyjnym Jellyfin → Aktywność odtwarzania → Informacje o odtwarzaniu, czy używa `Direct Play`, `Direct Stream` lub `Transcoding`. Jeżeli nadal tylko słychać dźwięk, na czas diagnostyki wyłącz MisioFlix lub zdejmij klasę motywu w konsoli: `document.documentElement.classList.remove('misioflix-skin')`. Jeśli obraz pozostaje czarny bez motywu, podejrzane jest dekodowanie/strumień, a nie wyświetlanie kart.

Ustawienia strony startowej pozostają: natywne sekcje 1–10 `Brak`, natywne sekcje bibliotek odznaczone. Wtyczka nie zmienia plików NFO ani odtwarzacza Jellyfin.
