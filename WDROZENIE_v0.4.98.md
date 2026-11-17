# Wdrożenie MisioFlix v0.4.98 — kolaże kolekcji

## Instalacja
1. Wgraj pliki z `MisioFlix_Native_v0.4.98_GitHub_PELNE.zip` do repozytorium `kumblip/misioflix`, zachowując ścieżki.
2. W GitHub Actions sprawdź, czy `dotnet publish` dla Jellyfin 12.4 / .NET 10 zakończył się pomyślnie.
3. Po opublikowaniu Release zainstaluj skompilowaną paczkę wtyczki w Jellyfinie i uruchom serwer ponownie, jeśli instalator tego wymaga.
4. Odśwież Jellyfin Web, aby uniknąć starego `home.js` / `details.js` / `theme.css` w cache.

## Kontrola działania
- Otwórz „Kolekcje” na głównej i pełną listę.
- Odszukaj „Café Myszka” bez własnego plakatu. Powinien pokazać się podgląd z okładek zawartości, w tym filmu i serialu, jeśli te elementy mają obrazy.
- Sprawdź stronę szczegółów tego BoxSetu: powinien pojawić się kolaż w miejscu pustej grafiki.
- Otwórz kolekcję z własnym plakatem (np. „Flintstonowie” lub „Scooby-Doo”): jej oryginalna grafika musi pozostać bez zmian.
- Sprawdź pustą kolekcję i kolekcję bez plakatów filmów: pozostaje placeholder, bez błędów.
- Sprawdź kolaże zawierające dokładnie 1, 2, 3 i 4 okładki.
- Sprawdź, czy zwykłe plakaty filmów i seriali, statusy MAL/Simkl, łapki i licznik kolekcji są bez zmian.

## Bezpieczeństwo
Kolaże są tylko w przeglądarce. Aktualizacja nie wprowadza żadnej zmiany do synchronizacji NFO, zawartości BoxSetów ani plików mediów. Wersja nadal zawiera dotychczasową synchronizację NFO z v0.4.97, z jej uprawnieniami i osobnym harmonogramem — sama ta poprawka nie uruchamia żadnych nowych zapisów do Jellyfina.

## Testy wykonane przy przygotowaniu
- `python tools/run_tests.py` — weryfikacja regresji i JS.
- `node --check` dla zmienionych plików JS.
- Test układów 1/2/3/4 w headless Chromium.
- Brak lokalnego SDK .NET: kompilacja i test integracyjny na NAS nie zostały wykonane.
