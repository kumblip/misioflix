# Wdrożenie MisioFlix Native v0.4.25.0

1. Rozpakuj archiwum i prześlij pliki do istniejącego repozytorium GitHub `kumblip/misioflix`, zachowując strukturę folderów.
2. Nie zmieniaj `.github/workflows/build.yml` ani `release.yml`. Dotychczasowa wersja jest kompatybilna.
3. Uruchom Build w GitHub Actions. Po zielonej kompilacji pobierz paczkę `MisioFlix_0.4.25.0_JF12.4.zip`.
4. Zainstaluj ją w Jellyfin i uruchom ponownie kontener Jellyfin. Zrób pełne odświeżenie przeglądarki (Ctrl+Shift+R).
5. Sprawdź **Filmy PL**: czy istnieje `← Strona główna`, czy `Step Up &` i `The Whole Nine Yards + ...` prowadzą do zawartości, a zwykłe filmy otwierają szczegóły jak wcześniej.
6. Sprawdź bibliotekę anime: ma nadal otwierać się w działającym `#/mixed`, a przycisk `Strona główna` powinien wracać do `#/home`.

### Ograniczenia i diagnostyka

Jeżeli zbiór filmów nie ma plakatów potomnych dostępnych przez API, zamiast mozaiki pozostanie oryginalny symbol folderu.
Jeżeli kafelek folderu nadal nie reaguje, skopiuj z F12 → Elements pojedynczy element `<div class="card" ...>` oraz bezpośredni link po kliknięciu. Weryfikacja typu `Folder` / `BoxSet` jest kluczowa; nie zmieniaj w ciemno typu biblioteki.

Nie zmieniano zawartości bibliotek, NFO ani parametrów odtwarzania.
