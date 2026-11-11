# MisioFlix Native 0.4.27.0 — Ulubione, Kolekcje, AnimePL

## Naprawione
- Natywna karta **Ulubione** jest otwierana pod `#/home?tab=1`. MisioFlix nie montuje tam własnej strony głównej (tylko `#/home` i `#/home?tab=0`).
- Wychodząc z głównej strony do AnimePL i innych natywnych widoków, MisioFlix usuwa swój kontener także przed kliknięciem nagłówka oraz przy `hashchange`, aby nie pozostawiać go na nowej trasie.
- Kolekcje **BoxSet** są pobierane ze specjalnego, autoryzowanego endpointu `/MisioFlix/api/home/collections`, a nie zależnie od opcjonalnej biblioteki `boxsets` w `Users/{id}/Views`.
- Na głównej jest osobny rząd **Kolekcje** po AnimePL oraz przycisk przewijający do tego rzędu. W kolekcjach wyświetlane są tylko pozycje `Type=BoxSet`; zwykłe foldery są pomijane.
- Dla filmów pozostaje `CollapseBoxSetItems=false`: **bez** grupowania pojedynczych filmów w kolekcje.

## Nie zmieniono
- Odtwarzacza, stron szczegółów, widoku `#/mixed` dla AnimePL, NFO, danych użytkownika, filmów/odcinków i `.github/workflows`.

## Weryfikacja
106 testów Python, 2 skrypty Node. Chromium na odtworzonej nawigacji: główna, Ulubione, AnimePL i brak osobnej biblioteki Kolekcje w `/home/libraries`; brak wyjątków JS. Kompilacja DLL i rzeczywisty test Jellyfin na NAS **nie były wykonywane**.
