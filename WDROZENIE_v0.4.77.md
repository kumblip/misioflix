# MisioFlix Native v0.4.77.0 — wdrożenie

1. Wgraj zawartość pełnego ZIP-a do repozytorium `kumblip/misioflix` **z zachowaniem struktury katalogów**, zastępując starsze pliki. Aktualizacja przyrostowa wymaga istniejącej v0.4.76.0.
2. Uruchom dotychczasowy GitHub Actions. Numer wersji jest w `meta.json` i w `.csproj` (0.4.77.0).
3. Po udanym buildzie zainstaluj nową wtyczkę w Jellyfin, zrestartuj serwer/kontener i wymuś odświeżenie przeglądarki.
4. Wybierz anime z kilkoma sezonami (np. Zero no Tsukaima), wejdź w szczegóły jednego sezonu. Nad odcinkami powinny być przyciski `S01`, `S02` itd., a bieżący sezon ma wyróżnienie. Kliknij inny sezon i sprawdź przejście do jego odcinków.
5. Sprawdź: `ANIME › nazwa sezonu` (kliknięcie `ANIME` otwiera główną serię). `← Wstecz` z sezonu przenosi do głównej serii, a z niej na `#/home`.
6. Otwórz zwykły serial: wygląd nagłówka i zachowanie Wstecz powinny pozostać bez zmian.

Paczki zawierają **źródła GitHub**, a nie instalacyjną DLL. Testy źródłowe przeszły (361 Python + 28 Node). Nie testowano na rzeczywistym NAS-ie.
