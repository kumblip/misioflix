# MisioFlix 0.4.148.0 – ładowanie plakatów

Baza: 0.4.147.0. Kandydat do wydania, nie checkpoint STABLE.

- Plakaty własnych kart Home, propozycji, wznawiania i kolaży kolekcji pobierane są na żądanie w trzech stałych wysokościach maksymalnych 320, 480 i 640 px zależnie od rozmiaru karty i DPR. Oryginały i parametry jakości kodowania pozostają bez zmian; skalowanie i cache obsługuje Jellyfin. Maksymalna wysokość żądania to 640 px także na ekranach o bardzo wysokim DPR.
- Kolejka dopuszcza do 6 równoczesnych żądań własnych plakatów (nie jest globalnym limitem całego Jellyfina). Widoczne karty mają pierwszeństwo przed pobliskimi. IntersectionObserver dopuszcza także pobliskie karty podczas przewijania; starsze przeglądarki mogą nie obsługiwać scrollMargin, a bez obserwatora działa natywne lazy loading.
- Usunięcie kart zwalnia kolejkę i usuwa ich źródło obrazu; anulowanie faktycznego transferu zależy od przeglądarki. Istniejące, ponownie wykorzystywane węzły zachowują obraz. Limit oczekiwania zwalnia slot przy zawieszonym pobraniu.
- Bez zmian w CSS, wielkości kart, natywnych kartach Jellyfina, puli propozycji, sortowaniu, filtrach, losowaniu, diagnostyce, uprawnieniach i odtwarzaniu. Nie generujemy ani nie modyfikujemy plików graficznych w bibliotece.

## Weryfikacja
Test kolejki JS w tests/current/poster_queue_148.cjs: stałe rozdzielczości, limit slotów, priorytety, przeterminowane żądania, usunięcie i ponowne użycie kart, fallback. Test w Chromium na lokalnych przykładowych obrazach i CSS sprawdza poziome przewijanie, omijanie odległej karuzeli i dobór rozdzielczości na desktopie i ekranie mobilnym. Nie zastępuje testu prawdziwych obrazów na NAS-ie. Kompilacja .NET 10 i test NAS wymagane przed STABLE.
