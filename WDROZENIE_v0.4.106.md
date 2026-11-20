# Wdrożenie MisioFlix Native v0.4.106.0

1. Jeśli repozytorium zawiera **dokładnie v0.4.105.0**, wgraj zawartość ZIP „TYLKO ZMIANY” do głównego katalogu repozytorium, zastępując istniejące pliki i zachowując ścieżki. W przeciwnym wypadku użyj pełnych źródeł po sprawdzeniu ewentualnych późniejszych zmian.
2. Uruchom istniejące GitHub Actions `build`, potem `release` zgodnie z dotychczasową procedurą. Oczekiwany tag: `v0.4.106.0`.
3. Uruchom ponownie Jellyfin, następnie odśwież interfejs przeglądarki (`Ctrl+F5`).
4. Na stronie głównej, pod **„Oglądaj dalej”**, powinien pojawić się przełącznik „Pokaż biblioteki” w stanie **OFF**. Biblioteki nie powinny być widoczne.
5. Włącz przełącznik: biblioteki powinny się pojawić. Wyłącz: powinny się ukryć. Po opuszczeniu i ponownym otwarciu strony głównej przełącznik ma być znowu **OFF**.
6. Sprawdź, że skróty biblioteczne w górnym banerze i obie wyszukiwarki pozostają dostępne, niezależnie od przełącznika.

**Uwaga:** przy pierwszym pokazaniu bibliotek może pojawić się krótkie ładowanie karuzel; nadal używany jest oryginalny system leniwego pobierania kafelków.

Nie dodano instalatorów, nowych workflow, modyfikacji Jellyfin Web ani odrębnych portów.
