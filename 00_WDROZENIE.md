# MISIOFLIX — POPUP JAKO INTERFEJS MISIOCACHE

## Co robi poprawka
Zmienia wyłącznie kod UI strony głównej MisioFlixa: popup **Smart Downloads** odczytuje i zapisuje ustawienia przez udostępnione API `window.MisioCacheSmartDownloads.getSettings()` / `.saveSettings()` z oddzielnej wtyczki MisioCache. Nie zapisuje już zgody do własnego localStorage i nie pobiera żadnych plików. Przycisk „Wybierz odcinki” prowadzi do wspólnego panelu MisioCache — ustawienia > Pobieranie. Pozostałe elementy UI, logo mobilne, biblioteki, MAL, Simkl, karuzele i odtwarzacz pozostają bez zmian.

## Instalacja
Wgraj pliki z ZIP do `kumblip/misioflix`, zachowując ścieżki. Nie zmieniaj `.github`, `meta.json`, `manifest.json`, numeru wersji ręcznie. Wydaj wersję przez już poprawiony workflow MisioFlixa.

## Kolejność
Najpierw **MisioCache** z API i restartem Jellyfin, potem **MisioFlix**. Jeśli MisioCache nie udostępnia nowego API, popup jawnie zgłosi brak połączenia i nie potwierdzi fałszywie zapisu.

## Testy lokalne
`python tools/run_tests.py`: 535 testów Python + 61 skryptów testowych Node zakończonych powodzeniem. Nie testowano na rzeczywistym Androidzie ani nie kompilowano .NET 10 lokalnie.
