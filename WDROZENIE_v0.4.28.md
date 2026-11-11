# Instalacja MisioFlix v0.4.28.0

1. Rozpakuj archiwum aktualizacji źródłowej do katalogu repozytorium `kumblip/misioflix`, **z zachowaniem struktury katalogów**. Nadpisz tylko dostarczone pliki.
2. Nie edytuj `.github/workflows/build.yml` ani `.github/workflows/release.yml`. Numer wydania jest w `meta.json`, a kompilację uruchamia dotychczasowy GitHub Actions.
3. Po udanym buildzie zainstaluj ZIP z DLL jako aktualizację wtyczki w Jellyfin, uruchom ponownie serwer/kontener Jellyfin i odśwież stronę w przeglądarce `Ctrl+Shift+R`.
4. Sprawdź na stronie głównej: przycisk „Kolekcje” w banerze otwiera **osobny widok**, nie przewija strony; kliknięcie nagłówka karuzeli „Kolekcje” otwiera tę samą listę.
5. W widoku listy kolekcji sprawdź paginację „Pokaż kolejne”, otwieranie konkretnych kolekcji oraz powrót „Strona główna”.
6. Sprawdź przycisk „Strona główna” wewnątrz AnimePL i w bibliotekach filmowych: pozycja powinna być w dolnym lewym rogu, bez zasłaniania narzędzi u góry.
7. Kontrolnie otwórz Ulubione, AnimePL, Filmy ENG i Filmy PL. Nie włączaj globalnego grupowania filmów w kolekcje — nowa lista działa niezależnie.

**Ważne:** paczka zawiera źródła do GitHub, a nie skompilowaną DLL. Test na rzeczywistym Jellyfin 12.4 pozostaje do wykonania. W razie regresji można przywrócić ostatnią działającą wersję 0.4.27.
