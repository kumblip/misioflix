# Wdrożenie MisioFlix Native v0.4.107.0

1. Jeżeli repozytorium zawiera dokładnie **v0.4.106.0**, rozpakuj „TYLKO ZMIANY” w katalogu głównym repozytorium z zastąpieniem plików i zachowaniem ścieżek. W innym wypadku skorzystaj z pełnego źródła (po sprawdzeniu nowszych zmian).
2. Uruchom istniejący GitHub Actions `build`, a po udanym zbudowaniu `release`. Spodziewany tag: `v0.4.107.0`.
3. Uruchom ponownie Jellyfin i odśwież przeglądarkę (`Ctrl+F5`).
4. **Dashboard Jellyfina → Wtyczki → MisioFlix → Konfiguracja:** znajdź sekcję „Propozycje według gatunków”. Po załadowaniu listy zaznacz np. `Romans`, `Akcja`, `Komedia` i kliknij **„Zapisz wybrane gatunki”**.
5. Wróć na stronę główną MisioFlix. Pod „Pokaż biblioteki” jest niezależny przełącznik **„Pokaż propozycje”**. Stan początkowy to OFF; włącz go.
6. Sprawdź, że są wyłącznie zapisane gatunki, kafelki nie mają opisów, a ich ramki i łapki odpowiadają statusom MAL/Simkl.
7. Przewijaj w prawo przez więcej niż 12 tytułów, następnie kliknij „Losuj” i kontynuuj przewijanie. Nie powinno zatrzymywać się na pięciu tytułach. Wróć do „Ostatnio dodane” i sprawdź reset kolejności.
8. Powtórz na dwóch kontach Jellyfina z różnymi uprawnieniami: użytkownik nie powinien widzieć filmów, do których nie ma dostępu.

**Ważne:** Lista gatunków jest wspólna dla konfiguracji wtyczki, ale wyniki są **prywatne dla zalogowanego użytkownika**. Przy pustej liście wybranych gatunków na Home pojawia się tylko informacja, bez karuzel. Obie sekcje (biblioteki i gatunki) można pokazywać niezależnie.

Testy automatyczne nie zastępują kompilacji .NET 10 na GitHub Actions i sprawdzenia UI na prawdziwym Jellyfinie 12.4.
