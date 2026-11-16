# MisioFlix Native v0.4.81.0 — tytuły NFO i infinite scroll

Punkt wyjścia: v0.4.80.0. Zachowano integracje MAL/Simkl, numery sezonów, łapki, przycisk „Do góry”, odtwarzacz, bibliotekę i pozostałe funkcje.

## Wyszukiwanie anime — rozdzielone reguły

- **„Pokaż osobno sezony/speciale/itd.” odznaczone:** po wpisaniu tekstu wyszukiwane są wyłącznie `title` i `search_titles` **konkretnego obiektu Series/Movie**. Dla anime pochodzą one z jego `tvshow.nfo` / `movie.nfo` (oryginalny i alternatywny tytuł). Nie ma dopasowania rodzica po nazwach jego powiązanych sezonów, Speciali, OVA i ONA. W szczególności nazwa z `season.nfo` nie może już samodzielnie zwrócić nadrzędnej serii.
- **Opcja zaznaczona:** wyniki typu Season wyszukiwane są po ich własnym `season.nfo`. Nadal działają kombinacje ręcznych filtrów typu produkcji.
- Podpowiedzi (do 18) i kafelki korzystają z tej samej reguły; przy trafieniu po alternatywnej nazwie rodzica wyświetlany jest powód „Alternatywny tytuł: ...”.
- Filtry gatunków mogą nadal uwzględniać gatunki powiązanych sezonów, lecz nie wpływają na dopasowanie tekstu. Wyszukiwarka filmów/seriali poza anime zachowuje dotychczasowy sposób dopasowania.

## Infinite scroll

- W obu wyszukiwarkach usunięto manualny przycisk **„Pokaż kolejne”**. Pierwsza partia ma 30 kart; kolejne 30 kart jest dodawane do tej samej siatki, gdy przewijana zawartość okna wyszukiwania zbliża się do końca (próg 650 px). Zapobiega to dublowaniu i nie powoduje scrollowania strony pod dialogiem.
- Na dedykowanej stronie **Kolekcje** MisioFlixa zastąpiono manualne „Pokaż kolejne” pobieraniem kolejnych stron po 24 BoxSet, obserwowanym przez IntersectionObserver. Po błędzie pozostaje tylko „Spróbuj ponownie”.
- **Biblioteki na stronie głównej** miały już poziomy infinite scroll; mechanizm pozostał bez zmian.
- **Natywne widoki bibliotek Jellyfina** (`/mixed`, `/list`, etc.) nadal wykorzystują swój własny mechanizm przewijania i pobierania; MisioFlix nie podmienia ich obsługi ani nie wprowadza dodatkowych równoległych zapytań.

## Kontrola

Testy źródłowe, w tym regresje tytułów, 30-elementowych partii wyszukiwarki i 24-elementowych stron Kolekcji. Kompilacja DLL i testy na rzeczywistym NAS wymagają GitHub Actions oraz weryfikacji po instalacji.
