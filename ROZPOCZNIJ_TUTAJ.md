# Łatka Z_FLAGAMI

# MisioFlix — role bibliotek i oszczędniejsze wyszukiwanie (23.11.2026)

## Co zawiera poprawka

Zamiast sprawdzania `Anime` w NFO przy kwalifikacji każdego tytułu do Simkl, administrator klasyfikuje **całe biblioteki** według trwałego ID Jellyfina. Każda biblioteka ma jedną z ról:

- `Simkl — filmy i seriale` (`simkl`): wszystkie zwykłe filmy i seriale z tej biblioteki kwalifikują się do Simkl. Zapisana rola jest autorytatywna; tag `Anime` w NFO nie blokuje pozycji w przypisanej bibliotece Simkl. **Uwaga:** umieszczenie anime w bibliotece Simkl może spowodować jego synchronizację z Simkl.
- `Anime PL — NFO + MAL` (`anime_pl`): wyniki anime w filtrze Polski (lektor).
- `Anime ENG — NFO + MAL` (`anime_eng`): wyniki anime w filtrze Bez lektora (ENG).
- `Anime PL+ENG — NFO + MAL` (`anime_both`): wyniki w obu filtrach, ale bez duplikowania tej samej pozycji w wyszukiwaniu „Wszystkie”.

Filtr **Język anime** w wyszukiwarce ma 3 opcje: Polski (domyślnie), Bez lektora (ENG), Wszystkie (PL + ENG). Niezależnie od niego działają filtry poszczególnych bibliotek (zielony / czerwony / neutralny) oparte o ich identyfikator.

Zachowana została dodatkowa konfiguracja języka pojedynczego audio (Polski/Angielski/auto) dla flag. Rola i język audio są dwiema niezależnymi cechami biblioteki.

Nowo dodane biblioteki Jellyfina pojawiają się po kliknięciu **Odśwież listę bibliotek** w ustawieniach MisioFlixa; administrator zapisuje im rolę. Po zmianie ścieżki można przyjąć nowe ścieżki z Jellyfina. Zapis zmienia wyłącznie konfigurację MisioFlixa, nie przenosi plików.

## Wydajność (bez nieuzasadnionych obietnic)

1. Dla bibliotek z jednoznaczną rolą tag `Anime` nie jest odczytywany z NFO na ścieżkach Simkl — kwalifikacja wykorzystuje wczytaną konfigurację biblioteki i sprawdzenie ścieżki.
2. Wyszukiwarka anime **nadal czyta NFO**, gdy aktualizuje katalog, bo wymaga tytułu, gatunków, opisu i MAL ID. Działa istniejący cache sparsowanych NFO.
3. Wyszukiwarka pobiera katalog po otwarciu tylko, gdy brak ważnej migawki; automatyczna ponowna weryfikacja starej migawki następuje nie częściej niż co **24 godziny** (wcześniej: 90 sekund), a **Odśwież dane** działa natychmiast.
4. Cache jest izolowany na użytkownika/serwer i odświeżany po zapisaniu zmiany ról lub ścieżek (`LibraryPathsRevision`).
5. To ogranicza liczbę przeglądanych NFO i zapytań, ale nie można uczciwie podać procentowej redukcji CPU bez pomiarów na NAS.

## Ważna kompatybilność

* Stare role `other` są traktowane jako Simkl, żeby zachować dotychczasową funkcję zwykłych bibliotek po migracji.
* Przed pierwszym zapisaniem kompletnej mapy obowiązuje stara klasyfikacja i dodatkowy tagowy mechanizm zabezpieczający.
* Gdy mapa jest zapisana, lecz dla pliku nie znaleziono biblioteki/ścieżki, **nie synchronizuje się** go z Simkl (bezpieczny brak dopasowania). Przy dodawaniu nowej biblioteki trzeba ją skonfigurować.
* NFO, media, Jellyfin API i integracje MAL/Simkl nie są modyfikowane przez zapis ról. Dotychczasowe odczyty NFO dla MAL pozostają.

## Wgranie przez samą stronę GitHub

1. Upewnij się, czy obecna wersja repo ma moduł flag. Wybierz **WYŁĄCZNIE** odpowiadający jej wariant poprawki. Nie mieszaj wariantów.
2. Rozpakuj właściwy ZIP. Każdy plik umieść w istniejącej ścieżce w repozytorium `kumblip/misioflix`, używając `Add file → Upload files` w odpowiednim katalogu. **Nie wgrywaj samego ZIP-a.**
3. Zatwierdź do `main`, poczekaj na udane sprawdzenie w Actions; potem uruchom osobny workflow publikacji (`PUBLIKUJ`) zgodnie z dotychczasową procedurą.
4. Przed aktualizacją pluginu zachowaj poprzednią działającą paczkę oraz kopię konfiguracji Jellyfina.
5. W ustawieniach wtyczki otwórz `Biblioteki Jellyfin — ścieżki i klasyfikacja`, przypisz rolę każdej bibliotece, zastosuj przydatne aktualne ścieżki i **zapisz**.
6. Po odświeżeniu przeglądarki sprawdź stronę główną, bibliotekę Anime PL, Anime ENG, wyszukiwarkę i integracje MAL/Simkl. Na istniejącej wyszukiwarce możesz też użyć **Odśwież dane**.

## Oczekiwany przykład

| Biblioteka | Rola | Język pojedynczego, nieopisanego audio |
|---|---|---|
| Anime PL | Anime PL — NFO + MAL | Polski |
| Anime ENG | Anime ENG — NFO + MAL | Angielski |
| Anime PL+ENG (w przyszłości) | Anime PL+ENG — NFO + MAL | Auto (jeśli miks języków) |
| Filmy PL | Simkl | Polski |
| Filmy ENG | Simkl | Angielski |
| Seriale PL | Simkl | Polski |
| Seriale Animowane PL | Simkl | Polski |

## Testy i ograniczenia

- Wariant bez flag: **538/538 Python**, wszystkie **60 skryptów Node**.
- Wariant z flagami: **554/554 Python**, wszystkie **60 skryptów Node**.
- `node --check` dla `home.js`, `client.js`, `simkl.js` — OK.
- Test funkcji filtrowania w Node VM dla źródeł `lektor`, `original`, `both`, `all` — OK.
- **Nie wykonano kompilacji .NET 10 ani testów na prawdziwym serwerze NAS.** Potwierdzenie kompilacji oraz aktualizacji wymaga GitHub Actions i działania w Jellyfinie.
- Nie zmieniano plików `.github`, numeracja wydania pozostaje automatyczna.
