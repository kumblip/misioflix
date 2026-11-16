# MisioFlix Native v0.4.82.0 — wdrożenie

Wgraj do repozytorium komplet źródeł z paczki PELNE albo na dotychczasową wersję 0.4.81 nałóż TYLKO_ZMIANY, zachowując strukturę katalogów. Uruchom dotychczasowe GitHub Actions, opublikuj release i zainstaluj wtyczkę przez repozytorium Jellyfina. Po instalacji wykonaj wymagany restart serwera oraz odśwież klienta web (Ctrl+F5).

## Test na NAS

1. Wejdź w `AnimePL` lub inną bibliotekę — adres `#/mixed?topParentId=...` / `#/movies?topParentId=...` / `#/tv?topParentId=...`.
2. Zobacz pierwsze 100 natywnych kafelków. Przewiń blisko dołu biblioteki.
3. Sprawdź, czy pojawi się kolejne 100 elementów **pod istniejącymi** (bez przechodzenia na drugą stronę i bez duplikatów), a ich plakaty, dane i klikanie są poprawne.
4. Zmień sortowanie albo filtr i upewnij się, że stare doładowane pozycje znikają, a nowa lista nie miesza się z poprzednią.
5. Wejdź do obu wyszukiwarek i Kolekcji — ich infinite scroll z 0.4.81 ma pozostać bez zmian.
6. Jeśli nie doładowuje: otwórz DevTools Console i sprawdź komunikaty zaczynające się od `[MisioFlix Library Scroll]`. W Network sprawdź `library-scroll.js?v=0.4.82.0`, żądania `Users/.../Items` i poprawność statusu 200. W razie niezgodności oryginalna paginacja Jellyfina nadal działa.

## Ważne

To paczka źródeł. Testy statyczne/Node/Python wykonano lokalnie. Nie było możliwe zdalne sprawdzenie na Twoim NAS ani kompilacja DLL w tym środowisku.
