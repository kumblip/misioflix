# Wdrożenie MisioFlix v0.4.89.0

1. Prześlij pełną paczkę źródeł do repozytorium GitHub lub zmienione pliki z paczki różnicowej.
2. Zweryfikuj zielony `dotnet publish` i Release w GitHub Actions. Lokalnie nie kompilowano DLL .NET 10.
3. Zainstaluj nową wersję przez Jellyfin, uruchom ponownie serwer i użyj Ctrl+F5 w Edge.
4. Sprawdź **trzy** miejsca: film → Kolekcje, kolekcje na głównej, `#/home?mfCollections=1`. Wszystkie mają wyświetlać np. `3 🎬` w prawym górnym rogu na półprzezroczystym ciemnym tle.
5. Sprawdź brak zmian w wyszukiwarkach oraz działanie infinite scroll.

`zrobionepozamisioflixem.txt` jedynie dokumentuje Twoje niestandardowe CSS w Jellyfin; nie są automatycznie wstrzykiwane przez MisioFlix.
