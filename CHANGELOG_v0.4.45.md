# MisioFlix Native v0.4.45.0

Dwie ograniczone poprawki względem v0.4.44.0:

1. **Pierwsze wejście do biblioteki AnimePL (`#/mixed`)**: jeśli natywny Jellyfin 12.4 pokaże dokładnie błąd `TypeError: e.addScrollEventListener is not a function`, MisioFlix automatycznie wykona *jedną* próbę odświeżenia bieżącej strony. Ochrona `sessionStorage` uniemożliwia pętlę przeładowań. Na sprawnych stronach i przy innych błędach niczego nie przeładowuje. Nie podmieniamy, nie opakowujemy ani nie modyfikujemy skrolera Jellyfina. To bezpieczne obejście objawu zaobserwowanego przy zimnym uruchomieniu; przyczyna w natywnej kompilacji Jellyfina nie została niezależnie potwierdzona.
2. **Kafelki sezonów w szczegółach anime i seriali**: nakładka MisioFlix otrzymuje z autoryzowanego API Jellyfin rzeczywistą liczbę odcinków sezonu (`ChildCount`, ewentualnie `RecursiveItemCount`). Wyświetla ją w istniejącym bloku `liczba + niebieska łapka`. Gdy są dostępne statystyki MisioFlix, natywny różowy licznik *nieobejrzanych* elementów pozostaje ukryty zgodnie z poprzednimi regułami. Nie zamieniamy liczby nieobejrzanych odcinków na całkowitą ani nie zmyślamy brakujących wartości.

Bez zmian: działające ramki trzech stanów, MyAnimeList tylko dla anime, wygląd kart poza szczegółami, mechanizm odtwarzania, adresy bibliotek, workflow GitHub i pliki manifestów wydań.

Testy: `python tools/run_tests.py` (209 testów Pythona, 5 skryptów Node.js). Nie wykonywano testu na żywym serwerze Jellyfin; brak środowiska .NET do skompilowania DLL.
