# MisioFlix v0.4.14.0 — instalacja

1. Rozpakuj ZIP w głównym katalogu repozytorium `kumblip/misioflix`, tak aby pliki `.github`, `src`, `tests` oraz `meta.json` nadpisały poprzednią wersję.
2. Zatwierdź i wypchnij zmiany do `main`.
3. W GitHub Actions uruchom workflow `build` i sprawdź, czy przechodzą testy oraz kompilacja .NET 10.
4. Następnie uruchom workflow `release` z zatwierdzeniem `PUBLIKUJ`, publikując tag `v0.4.14.0`.
5. Po instalacji wtyczki w Jellyfin wykonaj twarde odświeżenie przeglądarki `Ctrl+Shift+R`.
6. Sprawdź na Home:
   - czy zniknęła pusta przerwa nad sekcją hero,
   - czy pod hero pojawiły się przyciski bibliotek,
   - czy działają obie wyszukiwarki,
   - czy filtr `Wszystko / Seriale / Filmy` działa w wyszukiwarce nie-anime,
   - czy wyniki otwierają szczegóły Jellyfin,
   - czy karuzele nadal przewijają się myszką i palcem.

Ustawienia Jellyfin pozostają takie jak wcześniej: natywne sekcje strony głównej nadal wyłączone, aby nie mieszały się z własnym Home MisioFlix.
