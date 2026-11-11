# MisioFlix Native 0.4.23.0 — naprawa bibliotek / Oglądaj dalej

## Zmiany
- Obejście awarii React #130 w nowoczesnych widokach bibliotek na zgłoszonej instalacji Jellyfin 12.4. Linki do bibliotek z MisioFlix oraz kliknięcia oryginalnych linków filmów/seriali kierują teraz do **istniejącego widoku Jellyfin `#/list?parentId=<ID>`** (bez własnej biblioteki ani zmian danych). Dotyczy także anime; folder zawiera wyłącznie oryginalne pozycje wybranej biblioteki.
- Przy opuszczaniu stron szczegółów MisioFlix przywraca przeniesione elementy DOM do ich pierwotnych miejsc. Zmniejsza to ryzyko konfliktu z React/SPA podczas zmiany ekranu.
- W `Oglądaj dalej` dodano szybką próbę natywnego odtwarzania przez istniejący delegowany mechanizm `shortcuts.js` Jellyfin. Przekazuje dokładny ID odcinka lub filmu i zapisany czas pozycji w `data-positionticks`. Za poprawnie obsłużone uważa kliknięcie tylko, gdy Jellyfin przejmie zdarzenie i wykryty zostanie start odtwarzania.
- Jeśli skrót natywny nie zadziała, nadal pozostaje sprawdzony mechanizm awaryjny: otwarcie konkretnego odcinka i naciśnięcie oryginalnego przycisku odtwarzania. Nie usunięto tego fallbacku.
- Nie zmieniono NFO, danych mediów, filtrów anime ani zawartości bibliotek. Nie zmieniono GitHub Actions.

## Kontrola
- 80/80 testów źródłowych Python i 2 testy Node.
- Test Chromium na lokalnym DOM: przyciski bibliotek, nawigacja z oryginalnego nagłówka, bezpośrednie wznowienie z obsłużonym zdarzeniem oraz fallback w razie braku obsługi.
- Niezweryfikowane na NAS: czy widok `#/list` rzeczywiście działa w tej instalacji oraz czy oryginalny delegowany handler istnieje w bieżącej stronie głównej. Nie przedstawiać lokalnej symulacji jako testu rzeczywistego Jellyfin.
