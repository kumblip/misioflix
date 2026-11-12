# Wdrożenie MisioFlix Native v0.4.36.0

1. W repozytorium `kumblip/misioflix` nadpisz dokładnie wskazane w ZIP pliki, zachowując ścieżki pod `src/`, `tests/current/`, `meta.json`.
2. **Nie** usuwaj pozostałych plików. Nie zmieniaj `.github/workflows/build.yml` ani `.github/workflows/release.yml`.
3. Uruchom GitHub Actions Build i upewnij się, że testy i kompilacja .NET przeszły. Przebieg testów lokalnych nie stanowi potwierdzenia kompilacji DLL.
4. Wgraj wygenerowaną przez GitHub paczkę instalacyjną Jellyfin, uruchom ponownie Jellyfin i odśwież stronę przez Ctrl+Shift+R.
5. Wejdź w szczegóły `Zero no Tsukaima` (MAL ID 1195), sprawdź liczbę odcinków i ponownych obejrzeń. Pierwsze wejście po upgrade odświeży cache. W razie potrzeby kliknij `Odśwież z MAL` — wymusi odczyt **tego** tytułu.
6. Sprawdź sezon innego anime, który ma osobne MAL ID, i przełącz konto Jellyfin — wyniki nie mogą mieszać się między użytkownikami.
7. Jeśli w polach nadal jest `Brak danych`, sprawdź odpowiedź sieciową `GET /MisioFlix/api/mal/item?...` (tylko `entry.episodes_watched`, `entry.times_rewatched`, bez nagłówków autoryzacyjnych).

**Uwaga:** pełne obejrzenia = pierwsze obejrzenie + `num_times_rewatched` dla ukończonego anime. Na przykład MAL pokazuje 5 powtórek → 6 pełnych seansów. Nie trzeba ponownie łączyć konta MAL ani poprawiać NFO.
