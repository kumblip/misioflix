# MisioFlix Native v0.4.42.0 — mobilna wyszukiwarka anime

## Zmiany
- Wyniki **wyszukiwarki anime** na urządzeniach o szerokości CSS do 680 px pokazują **trzy karty w rzędzie**, zamiast dwóch, tak jak biblioteka AnimePL.
- Tytuły kart anime w **bibliotece AnimePL i wyszukiwarce anime** są wyświetlane w **jednej linii**. Długie tytuły są wizualnie ucinane wielokropkiem; pełny tekst nazwy i link do szczegółów zostają zachowane w DOM.
- Uporządkowane odstępy karty i wyrównanie tytułu w mobilnej wyszukiwarce, tak aby wielkość plakatu i podpisu była zbliżona do biblioteki anime.
- Reguły są ograniczone do ekranu mobilnego i wyszukiwarki anime. **Wyszukiwarka filmów i seriali nie została zmieniona**.

## Pozostają bez zmian
- Dane z NFO, gatunki, opisy, rok, łapki, kolory ramek MAL.
- Logowanie, odczyt, zapis i cache MyAnimeList.
- Strona główna, ulubione, karuzele, odtwarzanie i biblioteki innych typów.
- `build.yml`, `release.yml`, struktura Jellyfin i pliki mediów.

## Uwaga
CSS dopasowuje szerokość wyników wyszukiwarki do trzech kolumn; nie podmienia natywnych komponentów Jellyfin ani nie modyfikuje mechanizmów przewijania.
