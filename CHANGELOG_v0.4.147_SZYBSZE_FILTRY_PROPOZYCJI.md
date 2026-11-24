# MisioFlix 0.4.147.0 – szybsze filtry propozycji

Baza: 0.4.146.0 (poprawiony filtr języka wyszukiwarki anime). Kandydat do wydania, nie checkpoint STABLE.

## Zmiany
- Przy przełączaniu audio, napisów i anime filtry wspólne są obliczane raz dla katalogu, a stałe warunki gatunków i bibliotek raz dla każdego zestawu propozycji na czas danego montażu Home.
- Zachowano istniejące sekcje karuzel; zestawy bez wyników są nadal usuwane. Niezmieniony zestaw z aktualnymi kartami nie pobiera ich ponownie ani nie resetuje przewijania.
- Zmiana zestawu natychmiast usuwa niepasujące karty. Aktualne, wcześniej autoryzowane karty z pierwszej strony są ponownie wykorzystywane jako istniejące węzły DOM, bez odtwarzania plakatów i zdarzeń. Brakujące karty pobierane są przez dotychczasowy endpoint z cache 45 s / 500 wpisów. Po wygaśnięciu lub unieważnieniu cache dane są ponownie sprawdzane.
- Każda zmiana zestawu unieważnia poprzednią operację ładowania. Opóźniona odpowiedź lub błąd nie mogą zmienić nowej karuzeli, jej offsetu ani stanu przycisków.
- Losowanie nadal obejmuje całą pulę, a nie pierwsze 10 kart. Zmiana filtra zachowuje względną kolejność losową pasujących tytułów i wybrany tryb sortowania istniejącego zestawu; przycisk Losuj tworzy nową losową kolejność. Zmieniony zestaw zaczyna od pierwszej strony (10 kart); dalsze strony po 25. Pusta karuzela nie zajmuje miejsca.
- Zachowano lazy loading, uprawnienia, natywne odtwarzanie, wygląd, MAL/SIMKL i działające rozróżnienie bibliotek anime PL/ENG/PL+ENG. Brak zmian w API, C# katalogu, CSS i diagnostyce.

## Weryfikacja
Pełny zestaw utrzymywanych testów `python tools/run_tests.py`, w tym nowy test rzeczywistych funkcji JS w symulowanym DOM: zachowanie węzłów, zapytania tylko dla brakujących kart, brak pracy dla niezmienionego zestawu, paginacja, cache TTL, usunięcie pustych zestawów, wyścigi odpowiedzi, kolejność i lazy loading. Dotychczasowe testy filtrów sprawdzają aktualne wyniki w istniejących karuzelach zamiast liczby ich ponownych konstrukcji.

Kompilacja .NET 10 w GitHub Actions oraz test na NAS-ie wymagane przed oznaczeniem STABLE. Nie wykonano pomiarów na urządzeniu.
