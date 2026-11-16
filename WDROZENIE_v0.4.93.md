# Wdrozenie MisioFlix v0.4.93.0

Bazuj na opublikowanym release v0.4.92.0. Pelny ZIP v0.4.93 jest kompletnym zrodlem GitHub; ZIP tylko zmiany naklada sie na pelne zrodla v0.4.92.

1. Wgraj pliki do repozytorium `kumblip/misioflix` zachowujac sciezki.
2. Poczekaj na zielone GitHub Actions (testy Python/Node oraz dotnet publish).
3. Opublikuj release v0.4.93.0 na podstawie poprawnego artefaktu CI.
4. Zaktualizuj wtyczke w Jellyfin 12.4, zrestartuj Jellyfin i wykonaj Ctrl+F5.
5. Sprawdz film nalezacy do kolekcji (np. Step Up 4), na glownej i w bibliotece. Zlota/niebieska/rozowa lapka powinna wystepowac PRZED liczba i 📦 w JEDNEJ ramce, z rownymi kolumnami i odstepami.
6. Sprawdz kolekcje BoxSet (N 🎬), wyszukiwarki, infinite scroll, MAL i Simkl pod katem regresji.

Wazne: pliki `Jellyfin_Wlasny_CSS.txt` i `zrobionepozamisioflixem.txt` sa dokumentacja zmian poza wtyczka, a nie CSS automatycznie instalowanym do Jellyfin.
