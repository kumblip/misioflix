# MisioFlix Native v0.4.118.0 — szybsze przewijanie karuzel

## Zakres
- Telefony Android/iOS i urządzenia dotykowe: wyłączenie przyciągania `scroll-snap` w karuzelach bibliotek, propozycji i „Oglądaj dalej”; zachowano natywne przewijanie bezwładnościowe, pionowy scroll i klikanie kafelków.
- Komputer: przeciąganie myszą i rysikiem ma mnożnik przesunięcia 1,35; gesty dotykowe pozostają pod kontrolą przeglądarki.
- Strzałki karuzel: zwiększony skok z 0,75–0,77 do 1,12–1,15 szerokości widoku, bez zmiany animacji przycisków.
- Nie zmieniono: liczby początkowych kafelków (10 w bibliotekach i propozycjach), paginacji, losowania, panelu biblioteki, ramek MAL/Simkl, informacji „i”, NFO ani workflow GitHub.

## Uwagi
Działanie bezwładności po szybkim przesunięciu palcem jest zależne od silnika przewijania Androida/iOS. Celowo nie dodajemy przechwytywania `touchmove`, własnej animacji ani `preventDefault` dla dotyku — zmniejsza to ryzyko regresji nawigacji i pionowego przewijania strony.
