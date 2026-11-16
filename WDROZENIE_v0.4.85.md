# Wdrożenie MisioFlix v0.4.85

1. Wgraj pełne źródła do `kumblip/misioflix`, pozostawiając workflow GitHub Actions.
2. Opublikuj wydanie v0.4.85.0 i zainstaluj je w Jellyfin 12.4; zrestartuj Jellyfin, jeśli wymaga tego instalator.
3. W Edge wykonaj Ctrl+F5.
4. Odtwórz odcinek np. S01E21 przez 1–5 sekund i użyj natywnego przycisku „Następny”.
5. Gdy uruchomi się S01E22, wróć do E21 i sprawdź, że ma status „Obejrzany” w samym Jellyfinie. Kolejny odcinek nie powinien zostać samoczynnie oznaczony.
6. Powtórz test po 30% i po zatrzymaniu przyciskiem Stop (w tym ostatnim przypadku poprzedni odcinek nie powinien być oznaczany jako obejrzany).
7. Jeśli wystąpi błąd, sprawdź Jellyfin log dla `MisioFlix: native Jellyfin next-episode watch mark failed` oraz konsolę dla `[MisioFlix Next Watch]`.

**Uwaga:** brak lokalnego SDK .NET 10 uniemożliwił kompilację tej paczki w środowisku przygotowania. To paczka źródłowa do kompilacji przez GitHub Actions, wymagająca weryfikacji na działającym Jellyfinie.
