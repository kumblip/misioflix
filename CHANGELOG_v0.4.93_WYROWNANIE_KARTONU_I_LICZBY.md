# MisioFlix v0.4.93 — wyrownanie licznika kolekcji i naprawa CI

## Stan wyjsciowy
Najnowszym opublikowanym release GitHub pozostaje v0.4.92.0. Ta wersja jest kolejnym kandydatem do opublikowania: v0.4.93.0. Nie zakladaj, ze wersje robocze 0.4.93/0.4.94 zostaly juz opublikowane.

## Zmiana wizualna
W kafelkach filmow i seriali nalezacych do BoxSetow liczba i ikona pudelka 📦 sa elementami tej samej ramki co lapki. Laczy je dwukolumnowy grid: pierwsza kolumna liczba wyrownana w prawo, druga kolumna o stalej szerokosci zgodnej z ikonami lapek, z jednakowym spacingiem. Lapki pozostaja nad oznaczeniem kolekcji. Dziala na kartach home i natywnych kartach biblioteki. Dla mobile jest osobne skalowanie. Zmiany tylko w home.js, client.js i theme.css; nie zmieniono danych kolekcji na serwerze.

## Naprawa CI
- Historyczne aktywne testy nie powinny sprawdzac stalego ciagu 0.4.92.0. Teraz pobieraja aktualny numer AssemblyVersion z projektu i porownuja go z meta.json.
- Testy formatu wiersza kolekcji sprawdzaja aktualny DOM (oddzielny element liczby i ikony) zamiast przestarzalego ciagu `3 📦` oraz komentarza CSS.
- Nowy test pilnuje zgodnosci wersji meta.json i csproj oraz braku zewnetrznej ramki licznika.
- Dotychczasowe funkcje MAL, Simkl, katalogu Jellyfin, playera i infinite scroll pozostaja bez zmian w dzialaniu.

## Weryfikacja
`python3 tools/run_tests.py` oraz `dotnet publish src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj --configuration Release --output build/publish` w GitHub Actions. Lokalny runtime nie ma SDK .NET 10, kompilacje potwierdza dopiero zielony workflow GitHub.
