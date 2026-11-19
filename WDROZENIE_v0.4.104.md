# Wdrożenie MisioFlix Native v0.4.104.0

1. Jeżeli gałąź `main` ma dokładnie v0.4.103.0, rozpakuj paczkę `TYLKO_ZMIANY_OD_103` do katalogu głównego repozytorium, zachowując ścieżki. W przeciwnym razie zastosuj pełne źródła, kontrolując ewentualne późniejsze zmiany.
2. Standardowo uruchom oryginalny GitHub Actions `build`, a po pomyślnym przebiegu `release` z `PUBLIKUJ`.
3. Zainstaluj wydanie `v0.4.104.0` w Jellyfin, uruchom ponownie serwer i odśwież przeglądarkę (Ctrl+F5).
4. W szczegółach anime sprawdź `Więcej podobnych`: pozycje zakończone na MAL mają zieloną ramkę, rozpoczęte złotą, nieobejrzane różową, a zakończone i wznowione złoto-zieloną. Nie może zostać klasa `mf-simkl-native-media` na kartach z `data-mf-anime="1"`.
5. Sprawdź film, serial i zwykłą animację **bez** tagu Anime — Simkl nadal ma własne ramki i ocenę. Sprawdź także tytuł z `<tag>Anime</tag>` znajdujący się poza katalogiem AnimePL: Simkl nie jest dla niego aktywny.
6. Zweryfikuj zwykłe Oglądaj dalej, player, kolekcje, MAL, wyszukiwarki, NFO i osobne profile użytkowników.

Brak nowych skryptów, patchy Git i zmian w `.github/workflows` oraz `tools/package.py`.
