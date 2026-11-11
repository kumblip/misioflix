# MisioFlix v0.4.18.0 — wdrożenie

**Paczka zawiera pliki aktualizacji źródeł istniejącego repozytorium** `kumblip/misioflix`, a nie gotowy zbudowany DLL. Nie usuwaj pozostałych plików repozytorium, których nie ma w ZIP (np. innych serwisów, obrazów oraz narzędzia manifestu).

1. Rozpakuj paczkę i wgraj pliki do istniejącego repozytorium GitHub, zachowując dokładnie ścieżki (`src/`, `.github/`, `tests/`, `tools/`). Nadpisz pliki o tych samych nazwach.
2. Zatwierdź zmiany w `main`. Otwórz **Actions → MisioFlix — build dla Jellyfin 12.4** i sprawdź testy oraz kompilację.
3. Oczekiwany artefakt GitHub Actions: `MisioFlix_0.4.18.0_JF12.4.zip` (nazwa z `steps.pack.outputs.archive`). To wynik kompilacji, **nie** niniejsza paczka źródeł.
4. Po udanym buildzie użyj sprawdzonej u siebie metody aktualizacji wtyczki Jellyfin, a następnie zrestartuj kontener. Jeśli publikujesz przez `release.yml`, wpisz `PUBLIKUJ` dopiero po zweryfikowaniu paczki.
5. W Jellyfin: sprawdź siedem przycisków po prawej stronie banera, pełną karuzelę pod nim, trwałe ukrycie karty przez ×, przełącznik Pokaż/Ukryj ukryte, przewijanie, dwukrotne losowanie po pięć kart i powrót do "Ostatnio dodane".
6. Sprawdź, czy odtwarzanie wideo dalej działa (v0.4.17 usuwała czarny obraz). Biblioteki, 52 gatunki i wyszukiwanie powinny zachować dotychczasowe działanie.

**Ważne:** przycisk × nie dotyka historii odtwarzania Jellyfin — ukrywa wyłącznie element w MisioFlix. Jeśli nie ma ukrytych kart, przełącznik jest widoczny, ale nieaktywny.
