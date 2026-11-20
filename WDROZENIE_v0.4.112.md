# Aktualizacja MisioFlix v0.4.111.0 → v0.4.112.0

1. Skorzystaj z `MisioFlix_Native_v0.4.112_TYLKO_ZMIANY_OD_111.zip`, jeżeli repozytorium zawiera dokładnie v0.4.111.0. Rozpakuj do katalogu głównego repozytorium, zachowując strukturę.
2. Jeśli baza repozytorium jest inna lub niepewna, wykorzystaj pełne źródła i przejrzyj ewentualne lokalne zmiany.
3. Uruchom istniejący GitHub Actions `build`; po jego powodzeniu `release`, tag `v0.4.112.0`. Nie trzeba zmieniać workflow ani instalować pakietów Pythona.
4. Zaktualizuj wtyczkę i zrestartuj Jellyfin. Otwórz ponownie stronę główną i odśwież ją (`Ctrl+F5`).
5. Sprawdź na banerze i w wyszukiwarce anime, czy widnieje tylko `Anime ENG`. Przetestuj bibliotekę i propozycje, aby zobaczyć maksymalnie 10 kafelków po pierwszym pobraniu oraz doładowanie kolejnych po przesunięciu karuzeli.

Ważne: MisioFlix nie usuwa starych bibliotek z Jellyfina. W Jellyfin → Dashboard → Biblioteki warto sprawdzić, czy nie istnieją dwie osobne biblioteki; prawdziwe duplikaty należy rozwiązać na poziomie Jellyfina, nie przez kasowanie danych w MisioFlix.
