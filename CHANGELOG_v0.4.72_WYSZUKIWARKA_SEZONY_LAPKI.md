# MisioFlix Native v0.4.72.0 — wyniki AnimePL: pojedyncze sezony i poprawne łapki

Baza: potwierdzony checkpoint **v0.4.71.0**.

- Włączony przełącznik „Pokaż osobne sezony / Specials” bez dodatkowych pozytywnych filtrów typu zwraca **same sezony/Specials**, nie agregat Series + Season.
- Wyłączony przełącznik zachowuje bazowy wynik jednej serii, która może pasować także przez tytuły NFO podłączonych sezonów.
- Jawne pozytywne filtry „Typy produkcji” pozwalają świadomie łączyć typy; zwykłe kliknięcie checkboxa nie powoduje niezamierzonych duplikatów.
- Dla typu Season w katalogu `season_count=null`; liczba `RecursiveItemCount` oznacza liczbę odcinków sezonu.
- Renderer również defensywnie zeruje `seasons` dla Season, zatem znikają fałszywe pomarańczowe łapki „13 sezonów”. Niebieskie łapki pozostają zgodne z liczbą odcinków.
- Zero zapisów NFO; nie zmieniono integracji MAL/Simkl, edytora metadanych i natywnych szczegółów.

## Dane testowe Arifureta

NFO nadrzędny + pięć `season.nfo`: prolog 2020 (1), 2019 (13), sezon 2 z 2022 (12), Special 2022 (1), sezon 3 z 2024 (16). Suma 43. Liczby pochodzą z pokazanych przez użytkownika kart Jellyfin, nie z tagów NFO (w NFO jest tylko numer sezonu).

Testy w GitHub Actions działają bez kopii wcześniejszych ZIP. Testy klienta JS i dane fikstury sprawdzają dwie strony przełącznika, filtrowanie typów oraz liczniki.
