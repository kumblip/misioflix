# MisioFlix v0.4.94 — precyzyjne wyrównanie licznika kolekcji

## Cel
Po v0.4.93 licznik kolekcji na kafelkach filmów i seriali nadal wizualnie odbiegał od wierszy z łapkami. Użytkownik doprecyzował, że **karton i liczba mają mieć tę samą szerokość kolumn i ten sam spacing co łapki i cyfry**, które są wzorem.

## Zmiany
- Dopracowano wyłącznie styl w `src/Jellyfin.Plugin.MisioFlix/Web/theme.css`.
- Wiersz członkostwa w kolekcji (`.mf-home-member-collection`, `.mf-native-collection-member`) przełączono na dwukolumnowy układ grid.
- Pierwsza kolumna przechowuje liczbę wyrównaną do prawej.
- Druga kolumna ma stałą szerokość równą szerokości ikony łapki.
- Dla widoków mobilnych zachowano analogiczne proporcje w mniejszej skali.
- Nadal obowiązuje jedna wspólna ramka dla całego bloku statystyk; nie dodano żadnej nowej ramki wewnętrznej.

## Efekt
- liczba i pudełko układają się w tej samej logice szerokości co cyfry i łapki,
- pudełko stoi dokładniej w tej samej kolumnie co łapki,
- odstęp liczba–pudełko jest zgodny z rytmem innych statystyk,
- cały blok w prawym górnym rogu wygląda bardziej równomiernie.
