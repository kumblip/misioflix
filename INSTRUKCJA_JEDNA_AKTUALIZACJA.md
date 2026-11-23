# MISIOFLIX — jedna aktualizacja, bez zmiany numeru w źródłach

## Co wprowadza paczka

Paczka jest BEZPOŚREDNIM zamiennikiem jeszcze niewgranej łatki
`MISIOFLIX_AUDIO_PL_NIE_PL_WSZYSTKIE_KOMPLETNA_LATKA_GITHUB.zip`.
**Nie trzeba nakładać ani tamtej paczki, ani osobnej poprawki nazw.**

Zawiera wcześniejsze poprawki: flagi PL/EN, kompaktowe ustawienia, role i
karuzele bibliotek, synchronizację kolekcji z `movie.nfo`, `tvshow.nfo`
i `season.nfo`, wybór bibliotek dla propozycji gatunkowych z domyślnym TAK.
Do tego dwa niezależne trójstopniowe filtry na stronie głównej w propozycjach:

* AUDIO: **Audio PL** (zielony, domyślny) → **Audio nie-PL** (błękitny) → **Wszystkie** (szary).
* NAPISY: **Wszystkie (z jasną ikoną CC)** (szary, domyślny) → **Napisy PL** (zielony) → **Napisy EN** (błękitny).

Filtry działają równocześnie (logiczne AND): np. Audio PL + Napisy EN
pokazuje tytuły z polskim dźwiękiem I angielskimi napisami. Audio nie-PL
oznacza potwierdzony brak polskiej ścieżki dźwięku (niekoniecznie angielski
język oryginału). Obydwa filtry dotyczą wyłącznie karuzel „Propozycje
według gatunków” oraz pełnych list tych propozycji. Nie zmieniają innych
karuzel, bibliotek, MAL, Simkl ani odtwarzacza.

## Jedna baza, bez nowego skanowania

Oba filtry korzystają z JEDNEGO serwerowego indeksu funkcji
„Flagi PL / ENG — dźwięk i napisy” (`misioflix/language-flags-index.json`
w katalogu danych Jellyfina). Serwer dołącza do istniejącego, już
uwierzytelnionego katalogu propozycji pola `pl_audio`, `pl_subtitles`,
`en_subtitles`. Odczyt w pamięci jest O(1) dla pozycji. Kliknięcie
przełącznika nie odpytuje plików wideo, nie skanuje NFO, nie zapisuje indeksu
i nie uruchamia dodatkowego endpointu. Informacje o językach mogą być
zbiorcze dla serialu/sezonu — nie oznacza to, że każda ścieżka jest
obecna w każdym odcinku.

Jeśli ścieżka nie została potwierdzona w indeksie, tytuł nie pojawi się
w trybie restrykcyjnym `Audio PL`/`Audio nie-PL` lub `Napisy PL`/`Napisy EN`.
W stanie `Wszystkie` nieznane dane NIE wykluczają tytułu. Przed pierwszym
użyciem zaleca się ręczne kliknięcie „Odśwież bazę języków audio i napisów”
w konfiguracji MisioFlixa.

## Instalacja WYŁĄCZNIE na stronie GitHub

1. Rozpakuj tę paczkę na komputerze.
2. Otwórz repozytorium `kumblip/misioflix` na gałęzi `main`.
3. Wgraj pliki do ich dokładnych ścieżek z ZIP — nie wgrywaj samego ZIP.
4. Pliki `src/...` zastąp w ich katalogach, a testy do `tests/current/`.
5. Zatwierdź zmiany w GitHubie i sprawdź wynik Actions.
6. Publikuj przez dotychczasowy workflow tylko po zaliczeniu builda.
7. Zainstaluj wtyczkę na Jellyfinie i odśwież ręcznie bazę języków.

**Numer wersji:** żadnej wersji ani pliku `.github` w repozytorium nie
zmieniono. Ponieważ ta łatka nie była jeszcze publikowana, jest jednym
zastępczym pakietem źródłowym. Przy rzeczywistej publikacji dotychczasowy
mechanizm GitHub Actions ustali kolejny wolny numer.

## Weryfikacja

* Python: **583/583** (testy pod `tests/current/`).
* Node: **64/64**.
* `node --check` dla `home.js`: OK.
* .NET 10 / Jellyfin 12.4 na NAS-ie: NIE przetestowano tutaj.

Testy sprawdzają m.in. kombinacje filtrów (audio PL + napisy EN,
nie-PL + napisy EN), nieznane ścieżki, przechodzenie pełnego cyklu
trzech stanów i wspólną bazę flag.

Dodatkowo: jasna, niewielka ikona CC (napisy) widoczna tylko w stanie „Wszystkie” filtra napisów; bez zmian logiki i numerowania wydania.
