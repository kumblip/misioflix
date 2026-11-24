# MisioFlix 0.4.154.0 — zapis ról bibliotek i MAL

Baza: 0.4.153.0. Aktualizacja zawiera kompletne zmienione pliki, bez patcha.

- Zapisane identyfikatory i role bibliotek nadal mają pierwszeństwo. Jeżeli członkostwo lokalnego elementu nie daje przypisanej roli, mechanizm klasyfikacji uwzględnia zarówno zapisane rzeczywiste ścieżki Jellyfina (`JellyfinPaths`), jak i ścieżki niestandardowe (`Paths`). Rozpoznaje najbardziej szczegółowy pasujący katalog; przy równych ścieżkach preferuje rzeczywistą lokalizację Jellyfina. Sprzeczne przypisania SIMKL/anime nie są rozstrzygane arbitralnie.
- Stare `AnimeRoot` i `AnimeOriginalRoot` pozostają jedynie dla instalacji, które nie zapisały mapy bibliotek. Nie dopisano kolejnego domyślnego katalogu na sztywno.
- Panel bibliotek pokazuje, czy role są zapisane, czy tylko sugerowane/zmienione. Przycisk zapisu jest również nad listą. Po zapisie konfiguracja jest odczytywana ponownie i porównywana z wybranymi rolami oraz ścieżkami.
- Biblioteki wirtualne bez fizycznej ścieżki nie blokują zapisania mapy.
- Unieważniono stary cache katalogu. Zachowano autoryzację Jellyfina, NFO jako źródło MAL ID, tokeny, SIMKL, sposób ładowania plakatów i poprzednie funkcje.

## Wdrożenie

Nałóż pliki na 0.4.153.0. Standardowy build/release, restart Jellyfina, Ctrl+F5. Wejdź w MisioFlix → Biblioteki Jellyfin — ścieżki i klasyfikacja. Odśwież listę, sprawdź role Anime PL/ENG/PL+ENG, dla Anime PL użyj ścieżek Jellyfina, zapisz ścieżki i role. Oczekiwany komunikat: „Zapisano i potwierdzono … bibliotek na serwerze”. Następnie odśwież stronę i otwórz anime PL. Nie trzeba ponownie autoryzować MAL. Jeśli nadal brakuje powiązania, sprawdź komunikat panelu oraz czy konkretny tytuł posiada MAL ID w lokalnym NFO.

## Weryfikacja

618 testów Python i 80 skryptów Node.js PASS. Nowe testy Node symulują rzeczywiste zapisy i odczyty konfiguracji, w tym odmowę zapisu, wirtualne biblioteki i zachowanie istniejących ról. Testy C# są statycznymi testami kontraktu źródeł. Kompilacja .NET 10 i test integracyjny na NAS-ie pozostają do wykonania.
