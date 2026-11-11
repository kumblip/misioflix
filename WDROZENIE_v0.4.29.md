# Wdrożenie MisioFlix Native v0.4.29.0

1. Rozpakuj archiwum i skopiuj zawarte pliki do istniejącego repozytorium `kumblip/misioflix`, zachowując ścieżki. Są to źródła, nie gotowa DLL.
2. Nie modyfikuj workflow `.github/workflows/build.yml` ani `.github/workflows/release.yml`. Numer jest w `meta.json`.
3. W GitHub Actions uruchom Build. Po pomyślnej kompilacji wgraj wynikową paczkę wtyczki do Jellyfin, zrestartuj kontener i odśwież przeglądarkę `Ctrl+Shift+R`.
4. Na stronie głównej kliknij `AnimePL`, `Filmy ENG`, `Filmy PL`, `Seriale Animowane PL` i `Seriale PL`. Każdy przycisk powinien otwierać swoją bibliotekę, zamiast zostawiać pusty `#/home`.
5. Sprawdź `Kolekcje` w banerze i w nagłówku karuzeli (pełna lista), `Ulubione`, wyszukiwarki i powrót na główną.

W razie problemu spróbuj bezpośrednio adresu biblioteki z paska u góry i sprawdź konsolę przeglądarki; nie skanuj od nowa bibliotek i nie zmieniaj metadanych.
