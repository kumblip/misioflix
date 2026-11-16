# MisioFlix 0.4.87 — Wstecz z odtwarzacza do odcinka

- Przechwytuje tylko natywny przycisk odtwarzacza oznaczony `ArrowBackIcon` i `aria-label=Wstecz`. Nie zmienia przycisku Wstecz w szczegółach ani pozostałej nawigacji.
- Wyszukuje aktualnie odtwarzany odcinek po serwerowych zdarzeniach Jellyfina, z uwierzytelnionym użytkownikiem i powiązaniem z urządzeniem; nie używa historii przeglądarki.
- Nawiguje do `#/details?id=<aktywny odcinek>&serverId=...`, pozwala Jellyfinowi zatrzymać i zapisać odtwarzanie przez natywny `viewbeforehide`, następnie przeładowuje widok z nowymi danymi.
- Jeśli nie da się bezpiecznie ustalić odcinka, oddaje akcję natywnemu Jellyfinowi zamiast otwierać losowe szczegóły.
- Rozwiązanie dotyczy natywnego odtwarzacza Jellyfin Web; nie ingeruje w odtwarzacze zewnętrzne, zapis postępu, MAL, Simkl ani infinite scroll.
- Testy: `player_back_087.cjs`, `test_player_back_087.py`. Wymagany build .NET 10 w GitHub Actions i test w Jellyfin Web 12.4.
