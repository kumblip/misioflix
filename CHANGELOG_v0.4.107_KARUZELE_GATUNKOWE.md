# MisioFlix Native v0.4.107.0 — propozycje według wybranych gatunków

Bazą jest kompletne źródło **v0.4.106.0**. Żadne funkcje bibliotek, wyszukiwarek, MAL, Simkl, kolekcji, NFO ani odtwarzania nie zostały usunięte.

## Nowa sekcja na stronie głównej

- Pod przełącznikiem **„Pokaż biblioteki”** znajduje się niezależny przełącznik **„Pokaż propozycje”**, **OFF** przy każdym nowym wejściu na Home.
- Po włączeniu pojawiają się wyłącznie gatunki wskazane przez administratora w **Dashboard → Wtyczki → MisioFlix → Konfiguracja**.
- W konfiguracji jest wyszukiwalna lista gatunków i możliwość wielokrotnego zaznaczenia. Nazwy wynikają z istniejących NFO anime i gatunków Jellyfina dla filmów/seriali. Powtarzające się nazwy są połączone, a wybór jest zapisywany w `PluginConfiguration.RecommendationGenres`.
- Dla każdego zaznaczonego gatunku tworzona jest osobna pozioma karuzela w tym samym stylu co biblioteki, z tymi samymi plakatami, ramkami MAL/Simkl, łapkami oraz tytułem, **bez opisu** i z dopasowaną wysokością kafelków.
- **Ostatnio dodane**: sortowanie wszystkich pasujących produkcji po dacie dodania; **Losuj**: przetasowanie CAŁEJ pasującej puli, nie tylko pięciu tytułów.
- **Oba tryby** doładowują kolejne pozycje w porcjach po 12 podczas przewijania poziomego aż do końca puli. Nawigacja strzałkami też inicjuje kolejne pobranie na końcu.
- Dane katalogu są odczytywane **dopiero po włączeniu propozycji**, przez ten sam system pamięci podręcznej co wyszukiwarki (scoped per server/user). Nie ma dodatkowego skanu NFO przy samym otwarciu strony głównej.
- Na każdej porcji identyfikatory są ponownie sprawdzane przez zalogowanego użytkownika Jellyfina, a plakaty i postępy powstają przez tę samą funkcję `MakeHomeTile`, co w poprzednich bibliotekach. Nie ma wycieku pozycji pomiędzy kontami.

## Konfiguracja i odczyt serwera

- `Configuration/PluginConfiguration.cs`: nowe pole `RecommendationGenres` (domyślnie pusta lista).
- `Web/configPage.html`: panel zaznaczania i zapisywania gatunków przez istniejące API konfiguracji Jellyfina.
- `Controllers/MisioFlixController.cs`: trzy autoryzowane endpointy (wybrane nazwy, dostępne nazwy, kafelki dla 12/24 autoryzowanych identyfikatorów).
- `Services/MisioFlixCatalogService.cs`: bezpieczne uwierzytelnione pobieranie kafelków. Nie ma własnego odtwarzacza ani niezależnej bazy mediów.
- `Web/home.js` i `Web/theme.css`: dwa niezależne przełączniki, karuzele gatunkowe i ich wygląd.

## Świadomie bez zmian

- Nadal **nie** wprowadzono strumieniowego ładowania 50 wyników wyszukiwarki.
- Domyślne karuzele bibliotek zachowują obecny mechanizm „Losuj” — bez limitu pięciu działa tylko **nowy** moduł gatunkowy.
- Brak skryptów instalacyjnych, modyfikacji zewnętrznego Jellyfin Web czy dodatkowych portów.
- GitHub Actions i dotychczasowy mechanizm budowania pozostają oryginalne.

## Uwaga

Pierwsze otwarcie propozycji może wymagać pobrania całego katalogu wyszukiwarki, jeśli nie ma jeszcze aktualnej kopii w przeglądarce. Dopiero potem kafelki są pobierane po 12. Nie twierdzi się, że skraca to czas pierwszego skanu NFO.
