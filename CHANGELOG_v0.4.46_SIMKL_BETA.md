# MisioFlix Native v0.4.46.0 — Simkl (wersja TESTOWA)

Baza: zatwierdzona i nienaruszona v0.4.45.0, kopia archiwum poza repozytorium.

## Nowości

- Całkowicie osobny moduł Simkl: `MisioFlixSimklService`, `MisioFlixSimklController`, `simkl.js`, `simkl.css`.
- Konfiguracja własnego Simkl AUTH V2 Client ID w administracji, powiązanie osobnego konta Simkl per użytkownik Jellyfin przez PIN i PKCE.
- Panel `Moje Simkl` pod plakatem filmu lub serialu, układ dopasowany do MAL, lecz własne klasy CSS i własne endpointy.
- Obsługiwane filmy i seriale aktorskie i animowane, poza `AnimeRoot` (AnimePL). Sezon używa statusu i oceny całego serialu Simkl.
- Odczyt ocen, statusów, sum obejrzanych odcinków z Simkl przez `/sync/activities`, `/sync/all-items` oraz zmiany delta.
- Zmiany statusu lub oceny zapisują się tylko po ręcznym otwarciu `Edytuj Simkl`, kliknięciu `Zapisz w Simkl` i potwierdzeniu.
- Tokeny i pamięć podręczna niezależne od MAL; dane kont chronione po stronie NAS. Brak automatycznego skroblowania i dwukierunkowej synchronizacji odtwarzania.
- Dodano zabezpieczenie dopasowania według identyfikatorów TMDB/IMDb/TVDB i weryfikację uprawnień bibliotek Jellyfin.

## Bez zmian

- Odtwarzacz Jellyfin, MAL, różowe/zielone/złote ramki, listy bibliotek, grafiki, NFO, liczniki łapek, obsada, wyszukiwanie oraz workflow GitHub Actions.
- Nie dotykano `mal.js`, `home.js`, `client.js`, `details.js`, `theme.css` ani systemu odtwarzania.

## Testy i ograniczenia

- 225 testów Python + 6 testów Node: PASS.
- BRAK środowiska .NET 10 do kompilacji DLL; kod wymaga kompilacji przez GitHub Actions i praktycznych testów na Jellyfin 12.4.
- BRAK realnych tokenów i połączenia konta Simkl w tym środowisku; najpierw sprawdź połączenie AUTH V2, odczyt i zapisy przy użyciu materiału testowego.
- Zapis oceny w Simkl może zmienić status danego tytułu (zachowanie API Simkl). Wtyczka zapisuje wybrany status po zapisie oceny.
- Postęp odcinków i ponowne obejrzenia: odczyt informacyjny; nie modyfikuje się historii konkretnych odcinków.
- W przypadku bezpośredniej zmiany statusu serialu na `completed`, zachowanie po stronie Simkl może zmienić agregowane informacje o obejrzeniu, co jest działaniem API Simkl.

## Źródła API

- https://api.simkl.org/api-reference/auth
- https://api.simkl.org/api-reference/auth-v2
- https://api.simkl.org/api-reference/simkl/get-all-items
- https://api.simkl.org/api-reference/simkl/add-to-list
- https://api.simkl.org/api-reference/simkl/remove-ratings
