# Wdrożenie MisioFlix 0.4.38.0 i zbieranie diagnostyki MAL

1. Wgraj pliki ZIP do katalogu głównego istniejącego repozytorium MisioFlix w GitHub (nadpisz pliki o tych samych ścieżkach). **Nie usuwaj pozostałych plików**. Nie zmieniaj `.github/workflows/build.yml` ani `release.yml`.
2. Uruchom Build i sprawdź, czy kompilacja .NET 10 przebiegła pomyślnie. Opublikuj wydanie standardową procedurą projektu, następnie zaktualizuj wtyczkę i zrestartuj Jellyfin. Odśwież stronę przeglądarki klawiszami Ctrl+Shift+R.
3. Otwórz **Zero no Tsukaima** (MAL ID `1195`), przewiń do panelu **Moje MyAnimeList**, rozwiń **Diagnostyka MAL** i kliknij **Uruchom diagnostykę**.
4. Odczekaj na wynik w polu tekstowym, kliknij **Zaznacz raport**, skopiuj całą zawartość i wklej do rozmowy. Nie trzeba otwierać narzędzi deweloperskich ani pokazywać zawartości tokenów.
5. Porównaj linie `num_times_rewatched` przy `MAL GET standard` i `MAL GET jawne pola`:
   - standard `NIE ZWRÓCONO`, jawne pola `5` = trzeba zmienić produkcyjny selektor pól GET;
   - oba `NIE ZWRÓCONO` = MAL nie udostępnił wartości tą metodą; przyda się dalsza diagnostyka, bez zgadywania;
   - oba `5`, a panel nadal `Brak danych` = problem przy odczycie/cache/serializacji wtyczki;
   - `HTTP 400` dla jawnych pól = MAL odrzucił selektor, nie oznacza to braku danych w koncie.

**Ważne:** raport pokazuje tylko wybrane klucze i liczniki, nie pełną odpowiedź MAL. Przed wysłaniem możesz go przejrzeć. Ani przycisk diagnostyki, ani odświeżanie nie zmieniają liczby rewatchy.

Karty anime w `#/mixed` zachowują natywne linki i strukturę przewijania; ich nowe łapki i rok są pasywnymi nakładkami CSS. Po aktualizacji sprawdź również bibliotekę AnimePL.
