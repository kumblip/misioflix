# Wdrożenie MisioFlix 0.4.32.0

1. Rozpakuj archiwum i skopiuj pliki na odpowiednie ścieżki w istniejącym repozytorium GitHub. Nie usuwaj pozostałych plików.
2. Zaktualizuj `src/.../MisioFlixCatalogService.cs`, `Controllers/MisioFlixController.cs`, `Web/mal.js`, pliki wersji oraz dołączone testy.
3. Uruchom zwykły GitHub Actions Build. Nie zmieniaj workflow.
4. Zainstaluj wygenerowaną wtyczkę 0.4.32.0, uruchom ponownie Jellyfin i odśwież interfejs (Ctrl+Shift+R).
5. Otwórz szczegóły Zero no Tsukaima, sprawdź, czy w panelu pojawia się `MAL ID: 1195` (dla pliku `season.nfo` wskazanego w zgłoszeniu) oraz istniejąca ocena i status MAL — o ile odpowiednia pozycja rzeczywiście odczytuje ten plik w katalogu NAS i jest dostępna dla danego użytkownika.
6. Następnie wejdź w sezon 2, jeśli ma osobny `season.nfo`, i sprawdź, czy dostaje właściwy własny MAL ID.

## Jeżeli ponownie wystąpi błąd

Wejdź w DevTools → Network (Sieć) i odfiltruj `mal/resolve`, `mal/item`. Podaj sam status HTTP oraz odpowiedź JSON `{ "error": "..." }` bez nagłówków autoryzacyjnych, kodów OAuth, cookies ani tokenów.

`GET /MisioFlix/api/mal/resolve` sprawdza tylko uprawnioną pozycję Jellyfin oraz lokalne NFO. Nie odpytuje zewnętrznego MyAnimeList. Dane z MAL są pobierane dopiero później, a cache jest zachowany.

**Uwaga:** powyższa poprawka została sprawdzona testami źródeł, lecz nie została skompilowana ani zweryfikowana na NAS-ie. W przypadku problemów z ścieżką NFO sprawdź mapowanie `/media/raid/animelektor` w kontenerze Jellyfin.
