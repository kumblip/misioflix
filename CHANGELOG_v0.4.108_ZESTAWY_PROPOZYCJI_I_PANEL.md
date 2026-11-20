# MisioFlix Native v0.4.108.0 — zestawy propozycji i zwijane ustawienia

Baza: pełne źródła **v0.4.107.0**. Wersja v0.4.108.0 nie zmienia działania MAL, Simkl, NFO, odtwarzania ani istniejącego mechanizmu GitHub Actions.

## Strona główna

Bezpośrednio pod sekcją „Oglądaj dalej”, w **jednym poziomym rzędzie**, są trzy przyciski typu switch:

1. „Pokaż biblioteki” — domyślnie OFF, tak jak w v0.4.106.
2. „Pokaż propozycje” — domyślnie OFF, tak jak w v0.4.107.
3. „Uwzględnij anime” — domyślnie ON; wyłącza/włącza anime tylko w propozycjach, bez zmiany samej biblioteki i integracji MAL/Simkl.

Na bardzo wąskim ekranie cały pasek pozostaje pojedynczym rzędem i w razie konieczności przewija się poziomo. Biblioteki i propozycje nadal mają niezależną widoczność.

**Propozycje gatunkowe** domyślnie działają w trybie **Losuj**. Przycisk „Ostatnio dodane” jest dostępną opcją, a ponowne kliknięcie „Losuj” miesza całą pulę. Paginacja jest bez limitu pięciu: kolejne strony po 12 pozycji do wyczerpania wyników. Kafelki zachowują plakaty, łapki i ramki statusu, ale bez opisów.

## Panel administracyjny Jellyfina → Wtyczki → MisioFlix

Wszystkie dotychczasowe grupy panelu są niezależnie zwijane i **domyślnie zamknięte**:

- MyAnimeList,
- Simkl,
- Kolekcje Jellyfina z NFO,
- Stałe okładki kolekcji,
- Propozycje według gatunków,
- Aktualizacje MisioFlix.

Pod „Propozycje” administrator może stworzyć dowolną liczbę (maks. 48) zestawów przez „+ Dodaj propozycję”, usunąć wybrany zestaw i zapisać całość. Każdy ma osobno zwijany panel „Pokaż/ukryj gatunki”, domyślnie zamknięty, wyszukiwarkę gatunków, wielokrotny wybór oraz tryb:

- **Co najmniej jeden z wybranych gatunków** — OR;
- **Wszystkie wybrane gatunki** — AND.

Każdy zestaw tworzy **jedną karuzelę**, z pozycjami, które spełniają jego warunek. Typy anime i zwykłe filmy/seriale korzystają z dotychczasowych metadanych NFO/Jellyfin. Przełącznik „Uwzględnij anime” jest ustawieniem wyłącznie wyświetlania na stronie głównej i nie ingeruje w zapisane dane.

## Zgodność wsteczna i bezpieczeństwo

- Dotychczasowe `RecommendationGenres` z v0.4.107 są odczytywane jako osobne zestawy po jednym gatunku do czasu zapisania nowej konfiguracji.
- Nowe `RecommendationSets` są zapisane w normalnym pliku konfiguracji wtyczki Jellyfin, bez tokenów i indywidualnych danych użytkowników.
- Endpoint domowy zwraca jedynie nazwy wybranych gatunków i flagę ALL/ANY; dane oglądania, konta MAL/Simkl i poświadczenia nie są publikowane.
- Każdy użytkownik otrzymuje tylko swoje dozwolone pozycje przez istniejącą autoryzację Jellyfina.
- Sposób pobierania katalogu wyszukiwarki i jego cache pozostają niezmienione; nowe zestawy korzystają ze wspólnego katalogu użytkownika.

## Testy

475 testów Python i 52 skrypty Node.js — zaliczone. Nowe testy obejmują zestawy OR/AND, zmienianie zakresu anime, dziedziczenie gatunków sezonów, losowanie pełnej puli, zapis ustawień, migrację v0.4.107 i izolację danych MAL/Simkl.

**NIE wykonano:** kompilacji .NET 10 (brak SDK), testu w uruchomionym Jellyfin 12.4. Wymaga potwierdzenia po wdrożeniu na NAS-ie.
