# MisioFlix Native v0.4.75.0 — wdrożenie

1. Wgraj **pełną paczkę źródłową** ZIP do repozytorium GitHub, z zachowaniem struktury (`.github`, `src`, `meta.json` itp.). Alternatywnie, jeśli jesteś na v0.4.74.0, wgraj paczkę „tylko zmiany”.
2. Poczekaj na zakończenie standardowego GitHub Actions i opublikowanie release. Nie zmieniaj ręcznie numeru w workflow — wersja 0.4.75.0 jest w `meta.json` i `.csproj`.
3. Zaktualizuj wtyczkę na Jellyfin 12.4 i zrestartuj Jellyfin zgodnie z dotychczasową procedurą.
4. Otwórz wyszukiwarkę anime, wpisz `ari`: wyniki nie powinny już pojawiać się tylko z powodu obecności tego fragmentu w opisie/gatunku. Sprawdź też wyszukiwarkę filmów i seriali — teraz przeszukuje wyłącznie tytuł z Jellyfin.
5. W anime sprawdź jeden wiersz trzech grup na szerokim ekranie i cykl filtra „Obejrzane”: szary → zielony → czerwony → szary.

**Uwaga:** paczka zawiera kod źródłowy, nie skompilowaną DLL. Testy na NAS należy wykonać po kompilacji i instalacji.
