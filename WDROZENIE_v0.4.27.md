# MisioFlix v0.4.27 — wdrożenie

1. Rozpakuj archiwum ZIP. Wgraj pliki do repozytorium `kumblip/misioflix`, zachowując dokładnie strukturę katalogów i nadpisując poprzednie wersje.
2. `.github/workflows/build.yml` oraz `release.yml` pozostaw bez zmian.
3. Uruchom GitHub Actions → Build. Po poprawnym buildzie skompilowana paczka powinna mieć nazwę `MisioFlix_0.4.27.0_JF12.4.zip`.
4. Zainstaluj wersję w Jellyfin 12.4, zrestartuj kontener i wykonaj twarde odświeżenie strony (`Ctrl+Shift+R`).
5. Sprawdź: (a) w Ulubionych widzisz wyłącznie ulubione; (b) po wejściu w AnimePL pojawiają się karty; (c) na głównej jest rząd Kolekcje zaraz po AnimePL; (d) otwarcie BoxSet pokazuje zawarte filmy; (e) Filmy ENG/PL nadal wyświetlają pojedyncze filmy.

Jeśli AnimePL pozostaje puste mimo widocznej liczby 602 tytułów, nie skanuj biblioteki i nie edytuj NFO; potrzebna będzie konsola błędów/Network dla `#/mixed` (problem może leżeć w innym fragmencie Jellyfin/React).

**Uwaga:** lokalne testy nie stanowią testu na rzeczywistym NAS ani kompilacji DLL.
