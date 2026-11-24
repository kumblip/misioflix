# MisioFlix 0.4.152.0 — status propozycji według ramek

Baza: 0.4.151.0 CI FIX. Nie zmienia wyglądu ani kolorów ramek i przycisków.

- Wszystkie: pełna pula zgodna z pozostałymi filtrami, również bez ramki.
- Stan: Nierozpoczęte: różowa ramka (`unwatched`).
- Stan: Rozpoczęte: złota lub zielono-złota ramka (`started`, `mixed`).
- Stan: Zakończone: zielona ramka (`watched`).
- Wspólny resolver MAL dla ramek i filtra: osobisty indeks przeglądarki, powiązania i lokalny cache wpisów. Brak potwierdzonego statusu nie oznacza różowej ramki.
- SIMKL: istniejący resolver ramek, lokalna kopia konta użytkownika, uprawnione identyfikatory Jellyfin i ten sam mechanizm Resume (bez NextUp i ukrytych wpisów). Dopasowanie indeksowane według rodzaju i identyfikatora dostawcy. W razie wyłączenia modułu używany jest rzeczywisty bazowy stan ramki Jellyfin (dla anime bez MAL: brak ramki).
- Status jest obliczany dla całej autoryzowanej puli, przed losowaniem i stronicowaniem kart. Bez odczytu kolorów z widocznego DOM, dodatkowych zapytań do zewnętrznych MAL/SIMKL i zmian danych użytkownika. Pierwszy wybór filtra pobiera aktualne dane serwera i tożsamości MAL z NFO tak samo jak kafelki; kolejne stany korzystają z tej samej migawki do odświeżenia.
- Komunikat o pustych wynikach uwzględnia status oraz aktywne filtry, nie sugeruje bezpodstawnie problemu z indeksowaniem języków.
- Bez zmian w ładowaniu plakatów, wyszukiwarce, kolorystyce, diagnostyce, odtwarzaniu i kompatybilności modułów.

Lokalne testy: 612 Python, 79 skryptów Node. W tym test czterech stanów, konfliktów statusów Jellyfin i MAL/SIMKL, dwóch kolorów, wyłączonych modułów, nieznanych statusów, pełnej puli i spóźnionych odpowiedzi. Testy Python kodu C# są kontrolami źródłowymi; kompilacja .NET 10 i rzeczywiste dane NAS wymagają weryfikacji.

Nałożyć pliki na 0.4.151.0 CI FIX; build → release → restart Jellyfin → Ctrl+F5. Nie usuwać plików ani cache plakatów.
