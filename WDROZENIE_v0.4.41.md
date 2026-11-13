# Wdrożenie MisioFlix 0.4.41

1. Wgraj zawartość ZIP wprost do istniejącego repozytorium GitHub, nadpisując pliki i zachowując ścieżki. **Nie usuwaj innych plików repozytorium**. Nie zmieniaj `.github/workflows`.
2. Uruchom obecny workflow Build, a następnie opublikuj Release zgodnie z dotychczasową procedurą.
3. Zainstaluj nowe wydanie w Jellyfin, uruchom ponownie instancję i wykonaj twarde odświeżenie strony.
4. Sprawdź najpierw na komputerze AnimePL `#/mixed` — czy nie pojawia się `e.addScrollEventListener is not a function` i czy działa przewijanie. Jeśli błąd nadal się pojawia, nie testuj kolejnych zmian na tej stronie i prześlij zrzut stosu + konsoli, bez danych logowania.
5. Na Androidzie otwórz AnimePL i wyszukiwarkę anime: rok, łapki, gatunki, opisy i ramki statusów MAL powinny być widoczne. Sprawdź trzy stany MAL oraz przewijanie.
6. W szczegółach anime sprawdź ramki w „Sezony” i „Więcej podobnych”; brak MAL ID lub niepełna synchronizacja nie jest automatycznie oznaczany jako obejrzany.

Testy lokalne nie zastępują weryfikacji na NAS-ie. Wtyczka nadal korzysta z istniejącej konfiguracji OAuth, MAL i NFO.
