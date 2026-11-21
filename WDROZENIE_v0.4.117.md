# MisioFlix Native v0.4.117.0 — wdrożenie

**Baza:** v0.4.116.0. **Wydanie:** v0.4.117.0.

## Cel
Natywne pełne widoki bibliotek Jellyfina na Androidzie/iOS mają mieścić 3 istniejące kafelki na szerokość, podobnie jak karuzele MisioFlixa. Jest to zmiana **wyłącznie CSS** w zachowaniu elementów karty; nie zastępujemy, nie ukrywamy i nie generujemy żadnych kafelków.

## Co zmieniono
- `src/Jellyfin.Plugin.MisioFlix/Web/theme.css` — reguła `@media(max-width:680px)` ograniczona do `.mf-native-library-route`.
- Flex: trzy równe szerokości wyznaczone przez `flex-basis`; Grid: trzy kolumny przez `grid-template-columns`, przy zachowaniu oryginalnego `display` kontenera.
- Odstępy poziome 4 px. Brak zmian podglądu „i”, tytułów, plakatów, statusów MAL/Simkl, filtrowania, sortowania i przewijania.
- `meta.json`, projekt `.csproj` — numer wersji 0.4.117.0.
- Nowy test CSS oraz poprawka przenośności istniejącego testu wersji v0.4.116.

## Instalacja
1. Rozpakuj archiwum `MisioFlix_Native_v0.4.117_TYLKO_ZMIANY_OD_116.zip` w głównym katalogu repozytorium GitHub na źródła dokładnie v0.4.116; nadpisz pliki.
2. Uruchom obecny workflow `build` i później `release` dla tagu `v0.4.117.0`.
3. Zaktualizuj wtyczkę w Jellyfin, uruchom ponownie serwer i zamknij/otwórz aplikację Jellyfin, żeby pobrała nowy CSS.
4. Na telefonie otwórz bibliotekę (nie karuzelę główną), sprawdź siatkę trzech kafelków w rzędzie oraz tytuł, ramki, łapki i „i”.

## Weryfikacja
- 512 testów Python, 59 skryptów Node.js: **OK**.
- Chromium w widoku mobilnym 390 px: **trzy kafelki w rzędzie** zarówno przy natywnym kontenerze Flex, jak i Grid (test lokalnego układu, nie uruchomiona aplikacja Jellyfin).
- Kompilacja .NET 10 i realny test Android/iOS na NAS-ie — **nieuruchamiane**.
- Nie zmieniano GitHub Actions ani logiki odtwarzania/integracji.
