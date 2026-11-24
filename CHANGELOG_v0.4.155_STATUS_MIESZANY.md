# MisioFlix 0.4.155.0 — zielono-złote ramki w obu filtrach

Baza: działająca 0.4.154.0 (paczka MAL).

- Wszystkie: pełna pula zgodna z pozostałymi filtrami.
- Nierozpoczęte: różowe ramki.
- Rozpoczęte: złote i zielono-złote ramki.
- Zakończone: zielone i zielono-złote ramki.
- Stan `mixed` pozostaje w migawce propozycji i pasuje do obu odpowiednich filtrów. Brak rozpoznanego statusu nie jest klasyfikowany jako nierozpoczęty.
- Bez zmian w MAL, SIMKL, rolach bibliotek, wyglądzie ramek, plakatach, API i liczbie zapytań.

Testy: 618 Python i 80 skryptów Node.js PASS. Test propozycji sprawdza zielono-złote ramki zarówno MAL, jak i SIMKL w obu filtrach. Kompilacja .NET oraz sprawdzenie na NAS-ie pozostają do wykonania.

Wdrożenie: nałóż kompletne pliki z ZIP na 0.4.154.0, build, release, restart Jellyfina, Ctrl+F5.
