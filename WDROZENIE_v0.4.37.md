# Instalacja MisioFlix Native 0.4.37.0

Ta paczka zawiera zmienione pliki źródłowe i testy. **Nie jest paczką DLL** do bezpośredniej instalacji w Jellyfin.

1. Rozpakuj ZIP. Wgraj jego zawartość do istniejącego repozytorium `kumblip/misioflix`, zachowując ścieżki, nadpisując pliki o tych samych nazwach. Nie usuwaj plików, których ZIP nie zawiera.
2. GitHub → Actions → `MisioFlix — build dla Jellyfin 12.4` → `Run workflow`. Zweryfikuj pomyślną kompilację.
3. **Żeby wersja pojawiła się w repozytorium wtyczek**, uruchom również Actions → `MisioFlix - opublikuj wydanie dla Jellyfin` → Run workflow → wpisz `PUBLIKUJ` (to osobny, świadomie wymagający zatwierdzenia krok).
4. Po ukończeniu workflow publikacji sprawdź GitHub Releases: tag `v0.4.37.0`, plik `MisioFlix_0.4.37.0_JF12.4.zip`; następnie sprawdź `manifest.json` gałęzi main: najnowsze `versions[0].version` = `0.4.37.0`, `sourceUrl` wskazuje istniejący plik Release i `checksum` jest 32-znakowym MD5 archiwum.
5. W panelu Jellyfin → Wtyczki → Repozytoria zweryfikuj, że używasz **surowego pliku manifestu**, zwykle `https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json`, a nie adresu strony `github.com/.../blob/...`. Po publikacji odśwież katalog wtyczek i ewentualnie zrestartuj kontener Jellyfin, jeśli serwer używa starszej pamięci katalogu.
6. W katalogu wtyczek zainstaluj/aktualizuj do `0.4.37.0`, zrestartuj Jellyfin i wykonaj `Ctrl+Shift+R` w przeglądarce.

**Dlaczego 0.4.36 mogła nie pojawić się od razu?** Zrzut GitHub pokazuje wygenerowany wpis 0.4.36 w `manifest.json`, ale nie potwierdza, czy Jellyfin pobrał zaktualizowany manifest z odpowiedniego URL. `Build` nie jest tym samym co `Release`. Również ustawienie `autoUpdate:false` nie gwarantuje automatycznej instalacji.

## Testy w Jellyfin

1. Otwórz `AnimePL` (adres `#/mixed?...`). Karty powinny mieć oznaczenia MisioFlix: rok, typ, sezony/odcinki, gatunki NFO, ocenę MAL i ramkę zgodną ze statusem MAL; kliknięcie zachowuje natywną nawigację.
2. Otwórz `Zero no Tsukaima` → MAL ID 1195. Jeśli MAL zwróci `num_times_rewatched=5`, pozycja „Ponowne obejrzenia” pokazuje **5**. To liczba *powtórek*, nie łącznych seansów.
3. Zweryfikuj, że Filmy ENG/PL, seriale, odtwarzacz, Ulubione i Kolekcje działają jak przed aktualizacją.

Nie trzeba ponownie łączyć kont MAL ani zmieniać NFO/Client ID/Client Secret. Jeśli w katalogu Jellyfin nadal nie ma nowej wersji po prawidłowym Release, sprawdź adres repozytorium, jego ostatnio pobrany manifest oraz logi aktualizacji wtyczek — nie nadpisuj ręcznie manifestu niepasującą sumą MD5.
