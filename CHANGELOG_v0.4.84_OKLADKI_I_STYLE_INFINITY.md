# MisioFlix Native v0.4.84.0 — plakaty i pełne oznaczenia na doładowanych kafelkach

## Zgłoszenie

W v0.4.83 paginacja API została naprawiona i biblioteka AnimePL doładowuje następne setki pozycji. Na doładowanych kafelkach nadal brakowało plakatów, liczników i gatunków MisioFlixa; był pokazywany generyczny typ SERIAL oraz licznik należący do sklonowanego kafelka.

## Poprawki

- Dla doładowanego elementu używany jest **jego własny** `Items/{id}/Images/Primary`, do nowego rzeczywistego `<img>` wewnątrz oryginalnego obszaru obrazu. Nie próbuje się wyświetlać obrazu tła na kontenerze przeznaczonym dla `<img>`. Obraz może zostać pobrany również bez `ImageTags` w lekkiej odpowiedzi listy; Thumb jest rezerwą, jeśli posiada tag.
- Usuwane są skopiowane, przestarzałe znaczniki statusów React, liczby nieobejrzanych odcinków i elementy obrazu poprzedniej pozycji. Tytuł, rok i wszystkie lokalne href wskazują nowy obiekt.
- AnimePL otrzymuje od razu typ `ANIME`; rodzaj mediów nie jest już błędnie przejmowany po szablonie.
- **Usunięto błąd w dekoratorze**: `client.js` poprzednio dopuszczał metadane tylko dla kart w `mixedActiveList` (siatka React), więc ignorował wszystkie karty z osobnej sekcji infinite scroll. Teraz poprawnie dopuszcza także karty z `.mf-library-extra-deck`.
- Doładowane karty są przekazywane do dotychczasowej, uwierzytelnionej kolejki `/MisioFlix/api/overlays` (partie po 18) w celu uzyskania tych samych gatunków NFO, opisów, liczby sezonów/odcinków i identyfikatorów MAL / Simkl.
- Dla dodatkowej sekcji nie jest nadpisywany odstęp (`gap`) natywnego układu kart. Mechanizm paginacji z v0.4.83 pozostaje nienaruszony.

## Zakres

Wyłącznie generowanie i dekorowanie dodatkowych kart bibliotek Jellyfina. Natywne pierwsze 100 kart, wyszukiwarki, kolekcje, statusy MAL/Simkl i struktura oryginalnej siatki React pozostają bez zmian. Moduł nadal korzysta z osobnej, dodawanej przez MisioFlix siatki pod natywną listą React — nie jest natywnym rozszerzeniem komponentu React Jellyfina.

## Testy

Testy CI Python i Node oraz lokalny test przeglądarkowy Chromium dla skopiowanej karty i danych metadanych. Nie testowano na rzeczywistym NAS i Jellyfin 12.4 użytkownika. Przed wdrożeniem warto sprawdzić nowe karty w `#/mixed`, a następnie pozostałe biblioteki filmów i seriali.
