# Wdrożenie i test 0.4.141.0

**Źródła, nie instalator.** Przed publikacją sprawdź faktyczny stan main, tagi i wydania oraz kopię działającej DLL/konfiguracji NAS. Nie nadpisuj innych zmian repozytorium. Wersja 140 w przekazaniu ma tylko wstępne potwierdzenie działania. Przed wdrożeniem wykonaj jej smoke test, zachowaj 139 STABLE.

1. Na kopii repo zgodnej z dostarczonym 0.4.140.0 wykonaj `git apply --check MisioFlix_0.4.140_DO_0.4.141.patch`, potem `git apply MisioFlix_0.4.140_DO_0.4.141.patch`. Alternatywnie użyj zawartości katalogu `misioflix-main` z pełnego ZIP-a źródeł. Nie wgrywaj ZIP-a jako jednego pliku do repozytorium.
2. Sprawdź `git diff`, dodaj nowe pliki, commit/PR. Uruchom workflow build i upewnij się, że .NET 10 publish i pakowanie zakończyły się sukcesem. Nie zmieniaj manifestu ręcznie.
3. Wykonaj test kandydata przy użyciu zgodnego artefaktu instalacyjnego. Jeżeli dostępny numer zdalny jest wyższy, użyj istniejącego mechanizmu next_release_version.py / sync_version.py. Po udanej walidacji publikacja przez istniejący release workflow z polem PUBLIKUJ. Nie oznaczaj STABLE przed testem na NAS.

## Test diagnostyki
- Jako admin otwórz MisioFlix — ustawienia → Diagnostyka wydajności. Domyślnie obie części wyłączone. Przed włączeniem brak próbek; zwykły użytkownik nie może odczytać ani zmienić `/MisioFlix/api/diagnostics` (sprawdź GET i oba POST z prawidłową sesją bez uprawnień admina).
- Włącz i wyzeruj. Bez odświeżenia przeglądarki przejdź na Home. Otwórz Propozycje, przełącz audio/napisy/anime, losuj, przewijaj karuzele, przejdź do Bibliotek, sprawdź Oglądaj dalej (film i dokładny odcinek). Wykonaj 5–10 powtórzeń każdego scenariusza.
- Wróć do ustawień w tej samej karcie, otwórz sekcję i odśwież wyniki. Zweryfikuj liczbę próbek, eksport JSON, brak tokenów i ID, sensowne nieujemne pomiary. Brak danych nie oznacza 0 ms. Ciepły/zimny cache oznacza wyłącznie stan pamięci kart propozycji, nie całego serwera. Czas filtrowania to DOM, nie pobranie obrazów. Play nie oznacza pierwszej klatki.
- Wyłącz i wyczyść. Powtórz scenariusze: brak nowych pomiarów w tej karcie i na serwerze. Sprawdź zmianę konta, restart oraz reset w trakcie pomiaru. Serwer działa zbiorczo tylko po włączeniu przez admina, inne karty mają własny stan.
- Wykonaj wszystkie smoke testy z przekazania 140: wygląd, mobile, uprawnienia i batch fallback, MAL/SIMKL, NFO/kolekcje, pełna pula losowania i poprawne wznowienie.

## Kolejność następnych prac
142 — katalog bez limitu 16 000; 143 — aktualizacja różnicowa filtrów; 144 — plakaty; 145 — niezależne moduły i zgodność wtyczek; 146 — status oglądania za napisami; 147 — integracja i stabilizacja. Numery są robocze. Dopiero po weryfikacji 141 na NAS przejść do kolejnego etapu.
