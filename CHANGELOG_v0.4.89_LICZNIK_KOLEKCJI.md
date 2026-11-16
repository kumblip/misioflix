# MisioFlix Native v0.4.89.0 — licznik filmów kolekcji

- Kafelki BoxSet na stronie głównej i stronie `#/home?mfCollections=1`: przeniesiono istniejący licznik `liczba 🎬` z lewego górnego rogu do prawego górnego rogu plakatu.
- Karty kolekcji w szczegółach filmu i natywnych kolekcjach: istniejący licznik `.countIndicator` Jellyfina z prawidłową liczbą otrzymuje ikonę 🎬 oraz ten sam styl, pozycję i ciemne tło w miniramce.
- Nie podmieniono liczby filmów ani oryginalnych kafelków; `ChildCount` pozostaje źródłem dla niestandardowych kart, a natywny Jellyfin dla kart Jellyfina.
- Nie zmieniano wyszukiwarek, nawigacji w odtwarzaczu, MAL, Simkl ani infinite scroll.
- Dodano `zrobionepozamisioflixem.txt`: dokumentację zmian CSS po stronie Jellyfina, bez włączania ich do wtyczki.
- Do sprawdzenia na NAS: szczegóły pojedynczego filmu należącego do kolekcji, karuzela Kolekcje oraz pełny katalog Kolekcje.
