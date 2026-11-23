# MisioFlix — jedna aktualizacja, nowe biblioteki domyślnie TAK

Data: 23 listopada 2026 r.

## Baza

Użyto dokładnie poprzedniej pełnej paczki z flagami:
`MISIOFLIX_NFO_SEZONY_RAPORT_BIBLIOTEKI_PROPOZYCJE_Z_FLAGAMI_PELNE_ZRODLA.zip`.

Ten ZIP zawiera **całą poprzednią poprawkę** (kolekcje `movie.nfo`, `tvshow.nfo`, `season.nfo`, raport per biblioteka, wybór bibliotek dla propozycji, zabezpieczenia niepełnego skanu) oraz nową zasadę domyślnego wyboru bibliotek. Nie musisz wcześniej instalować poprzedniej paczki.

## Nowy wybór bibliotek w propozycjach

- W każdej propozycji każda istniejąca biblioteka jest domyślnie włączona.
- Gdy odznaczysz np. `Filmy ENG`, zapisywane jest **wyłącznie jej ID** na liście wykluczeń tej konkretnej propozycji.
- Później dodane biblioteki mają domyślnie **TAK**, nawet jeśli inne biblioteki są odznaczone.
- Zmiana nazwy lub ścieżki przy zachowanym identyfikatorze nie zmienia stanu TAK/NIE.
- Jeśli biblioteka zostanie usunięta i utworzona od nowa z nowym ID, zostanie potraktowana jak nowa i domyślnie włączona.
- Pole „Zaznacz wszystkie obecne biblioteki” umożliwia wyczyszczenie wykluczeń. Odznaczenie tego pola wyklucza wszystkie biblioteki **aktualnie znane**; biblioteki dodane w przyszłości będą mimo to domyślnie włączone.
- Odczytanie zawartości propozycji nadal używa istniejącego katalogu i cache; nie sprawdza tagu Anime w całej bibliotece na każde wejście.
- Przy odczycie pozycji występującej w kilku bibliotekach będzie ona uwzględniona, jeśli co najmniej jedna z jej bibliotek nie jest wykluczona.

## Kompatybilność

W zachowanej konfiguracji starszego typu `AllLibraries=false` + `LibraryIds` (lista zaznaczonych) panel konwertuje aktualnie znane biblioteki na listę wykluczeń po odświeżeniu. Należy otworzyć ustawienia i kliknąć „Zapisz propozycje”, aby trwale przejść na nowe zachowanie. Jeśli lista bibliotek Jellyfina jest niedostępna, nie wykonuje się niebezpiecznej migracji i zapis zostanie zablokowany do czasu poprawnego odczytu.

## Wgranie wyłącznie przez stronę github.com

1. Zabezpiecz bieżącą gałąź, a następnie rozpakuj **`MISIOFLIX_PROPONOWANE_GATUNKI_DOMYSLNIE_TAK_KOMPLETNA_LATKA_GITHUB.zip`**.
2. W repozytorium `kumblip/misioflix` wgraj/zmień pliki **z paczki** w tych samych folderach (GitHub → dany folder → Add file → Upload files). Nie wgrywaj samego ZIP-a.
3. Zatwierdź nowe pliki. Sprawdź **Actions**. Dopiero po pomyślnym buildzie uruchom workflow publikacji zgodnie z dotychczasową procedurą.
4. Po aktualizacji otwórz ustawienia „Propozycje według gatunków”, rozwiń propozycję → „Biblioteki”, ewentualnie odznacz wybrane biblioteki i użyj „Zapisz propozycje”.
5. Jeśli dodasz bibliotekę w Jellyfinie później, odśwież stronę ustawień; pojawi się zaznaczona. Odśwież dane katalogu, jeżeli jej nowe pozycje nie pokazują się od razu.

## Co pozostawiono bez zmian

- `.github/workflows` i automatyczne numerowanie buildów.
- Wszystkie mechanizmy MAL, Simkl, flag PL/ENG, karuzel, NFO i uprawnień.
- Nie wykonuje się operacji na multimediach, NFO ani plakatach.

## Testy

`python tools/run_tests.py`: **574/574 testy Python, 62/62 testy Node** pomyślnie. Test Node obejmuje ręczne wyłączenie, później dodaną bibliotekę, zmianę nazwy, migrację starego wyboru i „zaznacz wszystkie”.

Nie wykonano kompilacji .NET ani testu na działającym serwerze Jellyfin. Po aktualizacji konieczny jest build w GitHub Actions i test działania.
