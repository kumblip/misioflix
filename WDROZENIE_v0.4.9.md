# MisioFlix v0.4.9 — instrukcja wdrożenia w GitHub i Jellyfin

## Przed zmianą
1. Zachowaj działające wydanie v0.4.8 oraz kopię plików źródłowych w repozytorium `kumblip/misioflix`.
2. Wtyczka nadal używa oryginalnego adresu Jellyfin (port 8096) i **nie wymaga nowego Dockera** ani JavaScript Injectora.
3. Nie wklejaj dodatkowo CSS do Jellyfin > Dashboard > General: motyw jest ładowany przez natywną wtyczkę. Podwójne ładowanie może powodować konflikty.

## Aktualizacja
1. Rozpakuj `MisioFlix_Native_v0.4.9_Jellyfin_Theme_GitHub.zip`.
2. Skopiuj do katalogu głównego repozytorium **całą strukturę z ZIP**, nadpisując pliki o tej samej ścieżce (nie twórz dodatkowego katalogu nadrzędnego).
3. W gałęzi `main` wykonaj commit, np. `feat: MisioFlix native theme 0.4.9`.
4. W GitHub Actions uruchom `MisioFlix — build dla Jellyfin 12.4`. Kontroluj testy JS/Python oraz kompilację `.NET 10`.
5. Po zielonym buildzie uruchom istniejący workflow Release z wpisem `PUBLIKUJ`.
6. W Jellyfin > Wtyczki > Katalog zainstaluj v0.4.9.0. Po potwierdzeniu instalacji zrestartuj wyłącznie kontener Jellyfin.
7. W przeglądarce użyj `Ctrl+Shift+R`, następnie sprawdź bibliotekę, szczegóły filmu, sezon, odcinek i oryginalne odtwarzanie.

## Ważne testy na Twoim NAS-ie
- `http://kumadlaneko:8096/web/#/home` nie może pokazywać drugiego paska nawigacji.
- Kliknięcie oryginalnego plakatu musi otwierać `#/details` i nie może kończyć się 404.
- Lista `AnimePL — ostatnio dodane` pozostaje **jedną natywną karuzelą Jellyfin**.
- Na kartach rozpoznawanych przez `data-mf-card="1"` pojawiają się nakładki typu/roku, a po odpowiedzi `api/overlays` także gatunki, łapki i statusy.
- `api/overlays` ma pobierać metadane w partiach do 18 **widocznych** elementów, nie cały katalog. To ma działać w tle; nie może blokować ekranu głównego.
- Porównaj desktop i mobilną aplikację Jellyfin. Nie testowano TV.
- Możesz sprawdzić w DevTools > Network: filtr `overlays`. Odpowiedzi 401/404/500 oznaczają, że dane nakładek nie działają; oryginalna nawigacja powinna pozostać użyteczna.

## Znane ograniczenia
- W aktualnej wersji łapka pokazuje **osobistą ocenę Jellyfin**, nie wynik MAL; integracja ocen MAL na oryginalnym ekranie szczegółów jest kolejnym etapem.
- Dla anime bez prawidłowego NFO brak formatów/gatunków — brak automatycznego fallbacku z Jellyfin.
- Typ `mixed` biblioteki AnimePL może dostarczać poziome miniatury. Motyw **nie wymusza** nowych plakatów i nie pobiera dodatkowych obrazów.
- Wiele ustawień wewnętrznych Modern/Legacy w Jellyfin może się zmieniać; prawdziwy test selektorów jest możliwy dopiero w Twoim interfejsie.
- Nie kompilowano DLL w tej paczce. Pomyślne testy JS/Python oznaczają tylko walidację źródeł, nie pełną integrację.

## Bezpieczeństwo i licencja
- `GET /MisioFlix/api/overlays` wymaga autoryzacji i filtruje wskazane IDs na podstawie konta użytkownika Jellyfin.
- Odczyt NFO jest tylko do odczytu, z ograniczeniem rozmiaru i bez pobierania ścieżek z parametru użytkownika.
- Netflin (ahza-code/Netflin) jest udostępniony na GPL-2.0. Projekt służył jako inspiracja i referencja do selektorów Jellyfin. **Kod CSS Netflin nie został skopiowany ani włączony do paczki**, więc nie trzeba instalować Netflin ani jego dodatków.
