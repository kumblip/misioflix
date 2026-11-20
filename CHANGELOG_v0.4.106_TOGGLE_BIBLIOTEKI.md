# MisioFlix Native v0.4.106.0 — przełącznik bibliotek na stronie głównej

Bazą wydania jest pełne źródło **v0.4.105.0**. Nowa wersja nie zmienia sposobu publikowania ani struktury projektu.

## Nowa funkcja

Bezpośrednio pod karuzelą **„Oglądaj dalej”** znajduje się dostępny klawiaturą przełącznik **„Pokaż biblioteki”**:

- **Wyłączony (OFF)** — stan domyślny po każdym wejściu na stronę główną. Karuzele bibliotek są ukryte.
- **Włączony (ON)** — odsłania istniejące karuzele bibliotek (AnimePL, ewentualnie anime bez lektora, Kolekcje, Filmy, Seriale — zgodnie z katalogami dostępnymi użytkownikowi).
- Ponowne kliknięcie natychmiast ukrywa biblioteki, bez przeładowania strony.
- Przełącznik używa `role="switch"`, `aria-checked`, `aria-expanded` i `aria-controls`. Obsługuje klawiaturę jak natywny przycisk.
- Domyślnego stanu **nie zapisuje się** w localStorage, sesji, profilu Jellyfin ani na serwerze. Po powrocie na stronę jest ponownie OFF.

**Bez zmian:** baner i skróty do bibliotek, obie wyszukiwarki, „Oglądaj dalej”, wszystkie kolekcje, MAL, Simkl, NFO, playback, porządek karuzel i przewijanie. Strona „Kolekcje” zachowuje swój osobny widok.

## Zmiany techniczne

- `src/Jellyfin.Plugin.MisioFlix/Web/home.js` — przełącznik i ukrycie kontenera `.mf-home-rows` na starcie.
- `src/Jellyfin.Plugin.MisioFlix/Web/theme.css` — styl przełącznika, zachowano istniejące globalne ukrywanie elementów z atrybutem `hidden`.
- `tests/current/home_libraries_toggle_106.cjs` i `tests/current/test_home_libraries_toggle_106.py` — testy widoczności, dostępności, izolacji i wartości domyślnej.
- Dwa wcześniejsze testy miały na stałe zakodowany numer `0.4.105.0`, więc zastąpiono te asercje sprawdzaniem wersji z aktualnego `meta.json`.
- `meta.json` i `.csproj` — wersja `0.4.106.0`.

## Weryfikacja

Pełny zestaw `python3 tools/run_tests.py`: **467 testów Pythona i 48 testów Node.js — PASS**. `node --check home.js` i `node --check client.js` — PASS.

Kompilacja .NET 10 oraz test wizualny na prawdziwym Jellyfinie 12.4 nie zostały wykonane lokalnie.
