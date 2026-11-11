# Wdrożenie MisioFlix v0.4.23.0

1. Rozpakuj ZIP i nadpisz pliki we właściwych katalogach istniejącego repozytorium `kumblip/misioflix`.
2. **Nie trzeba wgrywać ponownie** `.github/workflows/build.yml` ani `release.yml`.
3. Zatwierdź pliki i uruchom GitHub Actions (Build).
4. Pobierz skompilowany archiwum instalacyjne `MisioFlix_0.4.23.0_JF12.4.zip` z poprawnego buildu (nie mylić ze źródłowym archiwum ZIP).
5. Zaktualizuj plugin, uruchom ponownie Jellyfin i wymuś odświeżenie przeglądarki `Ctrl+Shift+R`.

## Test akceptacyjny
- Ze strony głównej kliknij AnimePL, Filmy ENG, Filmy PL, Seriale Animowane PL i Seriale PL: każdy widok powinien pokazywać własne pozycje. Sprawdź także oryginalne przyciski w górnej belce.
- Sprawdź w URL `#/list?parentId=...` zamiast `#/movies?topParentId=...` i `#/tv?topParentId=...`.
- Otwórz stronę szczegółów, a następnie wróć do biblioteki: bez błędów React i bez duplikatów sekcji.
- Z `Oglądaj dalej` kliknij kafelek filmu i anime. Natywna próba odtwarzania może uruchomić odtwarzacz bezpośrednio; jeśli bieżący Jellyfin nie udostępnia handlera, pozostaje bezpieczny fallback z przejściem przez szczegóły.

Jeśli ponownie pojawi się `React #130` również pod `#/list?parentId=...`, przyczyną może być sam Jellyfin lub inny plugin; zapisz adres strony oraz konsolę przed kolejnymi zmianami. Do czasu diagnozy można przywrócić działającą v0.4.21.
