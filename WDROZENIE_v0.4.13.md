# MisioFlix v0.4.13.0 — instalacja

1. Rozpakuj ZIP w głównym katalogu repozytorium `kumblip/misioflix` tak, aby pliki `.github`, `src`, `tests` oraz `meta.json` trafiły do odpowiednich katalogów. Nie usuwaj pozostałych plików repozytorium.
2. Wgraj i zatwierdź zmiany do `main`.
3. W GitHub Actions sprawdź wynik workflow `build`. Powinny przejść testy v0.4.13 i kompilacja .NET 10.
4. Następnie uruchom `release` z zatwierdzeniem `PUBLIKUJ` — tag `v0.4.13.0`; Jellyfin pobierze aktualizację przez katalog wtyczek po odświeżeniu jego zadań.
5. Zrestartuj kontener Jellyfin tylko po poprawnym pobraniu i instalacji wtyczki, następnie odśwież stronę twardo `Ctrl+Shift+R`.
6. Sprawdź: klik plakatu (otwiera szczegóły), przeciąganie plakatu myszą w poziomie (nie otwiera szczegółów), przesunięcie palcem (telefon), doładowanie następnych kart przy końcu listy, strzałki i Losuj.

Wersja zachowuje ustawienia Jellyfin: sekcje startowe 1–10 `Brak`; biblioteki odznaczone w natywnych sekcjach strony głównej. Zmiana nie dotyka statusu oglądania i nie instaluje nowych wtyczek.
