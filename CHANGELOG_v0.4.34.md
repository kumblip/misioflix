# MisioFlix v0.4.34 — bezpieczne liczniki MAL

## Poprawione
- W `Web/mal.js` odczyt brakującego pola licznika MAL nie jest interpretowany jako zero.
- Akceptowane są różne formy pól odpowiedzi MAL, w tym `num_episodes_watched` (odczyt), `num_watched_episodes` (zapis) i PascalCase.
- Zmienianie samej oceny/statusu w formularzu nie przesyła z powrotem liczby obejrzanych odcinków ani liczby powtórek, jeśli użytkownik nie zmienił danego pola.
- Brakujące liczniki są opisane jako „Brak danych”. Dla ukończonego anime raportującego 0 odcinków wyświetlane jest ostrzeżenie o możliwych niepełnych danych.
- Wartość „Pełne obejrzenia” = 1 + `num_times_rewatched`, o ile MAL rzeczywiście dostarcza licznik i anime zostało obejrzane. Np. 5 powtórek => 6 pełnych seansów.

## Nierozwiązane po stronie backendu
- Istniejąca usługa `MisioFlixMalService.cs` NIE była dołączona do archiwów źródłowych przesłanych do analizy. Nie udało się zweryfikować, czy z MAL żądane i mapowane są `num_episodes_watched` i `num_times_rewatched`.
- Jeżeli backend serializuje brakujące liczby jako `0`, sam frontend nie może ich poprawnie odtworzyć. Do pełnej poprawki potrzebny jest kod usługi albo zanonimizowana odpowiedź `api/mal/item` (bez tokenów).

## Bez zmian
- Logowanie OAuth, NFO/MAL ID, oceny, ramki, podstrony szczegółów, odtwarzanie, workflow GitHub, częstotliwość odpytywania MAL.

## Weryfikacja
- 134/134 testy Python z lokalnie złożonych źródeł, zaliczony test Node `ui_v0411.cjs` i kontrola składni `mal.js`.
- Brak kompilacji DLL i testu konta MAL na NAS.
