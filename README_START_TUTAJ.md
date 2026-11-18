# MisioFlix 0.4.100 — szybka wyszukiwarka (patch na źródła v0.4.99)

**To jest paczka aktualizacji źródeł, nie gotowy plik DLL ani instalacyjny ZIP Jellyfin.**
W dniu przygotowania aktualna zawartość `main` w repozytorium
`https://github.com/kumblip/misioflix` zgłaszała w `meta.json` wersję `0.4.99.0`.
Załączony przez użytkownika komplet v0.4.94 jest starszy, dlatego **nie wolno**
publikować go jako v0.4.100 ani nadpisywać nim nowszych funkcji 0.4.95–0.4.99.

## Jak przygotować pełną v0.4.100 na Windows

W katalogu rozpakowanej paczki uruchom PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\PRZYGOTUJ_V100.ps1
```

Skrypt sklonuje repozytorium do **nowego folderu** i przerwie działanie, jeśli
pobrane źródła nie są dokładnie `0.4.99.0` albo różnią się krytyczne fragmenty.
Nie modyfikuje istniejącej instalacji ani oryginalnego repozytorium.
Potrzebne: Git, Python 3, Node.js, npm. Do lokalnej kompilacji DLL również .NET 10 SDK:

```powershell
powershell -ExecutionPolicy Bypass -File .\PRZYGOTUJ_V100.ps1 -Kompiluj
```

Aby użyć posiadanych źródeł v0.4.99 bez klonowania:

```powershell
powershell -ExecutionPolicy Bypass -File .\PRZYGOTUJ_V100.ps1 -Zrodla 'C:\sciezka\misioflix' -Kompiluj
```

**Uwaga:** uruchomienie po raz drugi w tym samym katalogu jest blokowane,
aby niczego nie nadpisywać. Przenieś poprzedni folder wynikowy, jeśli chcesz
wygenerować wydanie od nowa.

Jeśli testy się nie powiodą, nie publikuj ZIP ani DLL. Jeśli testy przejdą,
wyjściowy folder `MisioFlix_v0.4.100_ZRODLA` można przesłać do GitHub w zwykłym
workflow `build.yml` i opcjonalnie `release.yml` po zatwierdzeniu.

## Co dokładnie zmienia v0.4.100

- Wyszukiwarka anime i wyszukiwarka filmów/seriali korzystają z tego samego
  dotychczasowego API `/MisioFlix/api/catalog`, z tym samym zakresem bibliotek.
- Katalog pobrany raz nie znika z pamięci podczas zwykłego przejścia do innej
  podstrony Jellyfina i powrotu.
- Gdy przeglądarka udostępnia IndexedDB, zapis pełnego katalogu na tym urządzeniu
  pozwala wyświetlić wyniki również po odświeżeniu karty i ponownym otwarciu.
- Każdy zapis jest przypisany do `serverId` i `userId` Jellyfina; token NIE jest
  zapisywany w IndexedDB. Wylogowanie czyści lokalne snapshoty.
- Po 90 s od ostatniego udanego pobrania otwarcie wyszukiwarki pokazuje katalog
  z pamięci natychmiast i pobiera aktualną zawartość w tle. Po pobraniu nowej
  zawartości wyniki są aktualizowane, a wpisana fraza, filtry i pozycja przewijania
  są zachowane. W razie błędu zostaje poprzedni katalog z komunikatem.
- Przycisk „Odśwież dane” zawsze wymusza odczyt sieciowy.
- Jeśli IndexedDB jest niedostępny, pozostaje cache w RAM; przy błędach sieci
  zachowana jest dotychczasowa obsługa wyjątków.

## Czego nie zmienia

NFO, plików i folderów na NAS, API Jellyfina, rozdzielania anime/filmów/seriali,
sezonów, filtrów, kart, UI, MAL, Simkl, odtwarzania, historii, plakatów,
kolekcji, konfiguracji i manifestu repozytorium.

## Jakość i ograniczenia

Na lokalnej źródłowej bazie v0.4.94 poprawka przeszła **425 Python + 42 Node.js**;
jest nowy test pamięci, izolacji użytkowników i obejścia cache. Kod najnowszej
v0.4.99 sprawdzono pod kątem wszystkich kotwic do zastosowania poprawki, ale
**nie udało się skompilować DLL w środowisku przygotowania** (brak SDK dotnet)
ani sprawdzić wynikowego v0.4.100 na działającym NAS. Testy wykonywane przez
`PRZYGOTUJ_V100.ps1` na oryginalnej bazie 0.4.99 są obowiązkowe.

Jeśli nie możesz zgodzić się na chwilowe (do 90 sekund) wyświetlanie stanu z
pamięci, ustaw `SEARCH_CATALOG_FRESH_MS=0` w `home.js` po zastosowaniu patcha,
co wymusi weryfikację sieciową w tle przy każdym otwarciu z cache. Użytkownik
może też zawsze nacisnąć „Odśwież dane”. Nie da się zagwarantować całkowitej
świeżości danych bez żądania do serwera.

## Cofnięcie

Nowy folder źródeł można bezpiecznie usunąć. Nie modyfikuje instalacji.
Po zainstalowaniu wersji na NAS przywróć poprzednią DLL standardową metodą
Jellyfina i wykonaj restart Jellyfina. Cache lokalny jest pomocniczy i nie
zmienia żadnych danych serwera.
