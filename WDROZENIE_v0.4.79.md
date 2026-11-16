# Wdrożenie MisioFlix v0.4.79.0

1. Wgraj zawartość pełnego ZIP do głównego katalogu repozytorium `kumblip/misioflix` z zachowaniem struktury.
2. Uruchom dotychczasowy GitHub Actions (`meta.json` określa numer wersji; nie zmieniaj ręcznie build.yml).
3. Po zielonym buildzie opublikuj Release i upewnij się, że `manifest.json` wskazuje nową wersję 0.4.79.0, właściwy pakiet oraz ABI `12.4.0.0`.
4. Uaktualnij wtyczkę w Jellyfin, uruchom ponownie kontener Jellyfin, odśwież twardo Edge (`Ctrl+F5`).
5. W ustawieniach MisioFlix sprawdź wersję zainstalowaną i kliknij „Wymuś pobranie aktualnego katalogu”. Po kontrolnym odczycie powinien pojawić się status wersji zainstalowanej, GitHub i manifestu oraz data kontroli. Jeśli źródło nie działa, panel wyświetli jego rzeczywisty błąd.
6. Sprawdź nawigację, przewijanie, pasek sezonów NAD odcinkami, typ sezonu z NFO oraz mniejszy font tytułów szczegółów.

**Uwaga:** wtyczka nie aktualizuje własnej DLL bezpośrednio i nie instaluje automatycznie kolejnych wydań. Funkcja wymuszenia zmienia zapamiętany adres tylko własnego repozytorium, dodając parametr `?mf_refresh=...` w celu uniknięcia przeterminowanej kopii manifestu. W razie potrzeby można przywrócić kanoniczny URL repozytorium w panelu Jellyfin: `https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json`.

**Ograniczenie:** jeśli wydanie nie zostało opublikowane w manifeście, żadna operacja odświeżenia nie może jej udostępnić. Testy lokalne nie zastępują weryfikacji na Twoim Jellyfin 12.4.
