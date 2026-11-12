# MisioFlix 0.4.34 — wgranie zabezpieczenia liczników

1. Rozpakuj ZIP i nadpisz zawarte w nim pliki w istniejącym repozytorium `kumblip/misioflix`.
2. Nie usuwaj pozostałych plików, nie zmieniaj OAuth / MAL Client Secret / NFO ani plików `.github/workflows`.
3. Uruchom Build w GitHub Actions, zainstaluj wyprodukowaną paczkę w Jellyfin, zrestartuj wtyczkę/kontener i odśwież stronę.
4. Otwórz anime z MAL ID 1195, kliknij **Odśwież z MAL** i sprawdź oba liczniki. Z dokumentacji MAL: wartość **5** w polu „Total Times Re-watched Series” oznacza 5 ponownych seansów, czyli 6 pełnych obejrzeń.
5. **Jeśli MisioFlix nadal pokazuje 0 (lub 1 pełne obejrzenie), nie poprawiaj licznika na ślepo.** W DevTools (F12 → Network/Sieć) znajdź odpowiedź `/MisioFlix/api/mal/item?…` po naciśnięciu „Odśwież z MAL”. Otwórz kartę Response/Preview, sprawdź wyłącznie pola `entry` → `episodesWatched` / `timesRewatched` (lub oryginalne nazwy `num_episodes_watched`, `num_times_rewatched`).
6. Jeśli pola w odpowiedzi są błędne lub nieobecne, trzeba poprawić `src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixMalService.cs` (jeśli w tym repo ma inną ścieżkę, znajdź plik przez nazwę klasy `MisioFlixMalService`) i ewentualnie model `MalEntry`. Do analizy wystarczy kod bez tokenów, haseł i Client Secret.

**Uwaga:** To jest zabezpieczenie odczytu i zapisu po stronie przeglądarki, nie potwierdzona pełna naprawa mapowania liczników przez serwer. Nie zakładaj, że MAL zwraca 13 obejrzanych odcinków tylko dlatego, że NFO podaje 13 odcinków — licznik osobistej listy musi pochodzić bezpośrednio z MAL.
