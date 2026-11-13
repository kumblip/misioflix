# MisioFlix Native v0.4.48.0 — Simkl: sezony i odcinki (BETA)

Punkt stabilny: **v0.4.45.0**. Bazą modyfikacji jest **v0.4.47.0**. Brak zmian w MAL, odtwarzaniu, NFO, ramkach, karuzelach i workflow.

## Rozdzielenie edycji
- Film/serial (szczegóły tytułu): dotychczasowy status oraz jedna ocena Simkl dla całego tytułu.
- Sezon: **tylko historia tego sezonu**; oznaczenie wszystkich odcinków jako obejrzanych / nieobejrzanych przez /sync/history lub /sync/history/remove z `shows[].seasons[].number`.
- Poszczególne odcinki: ręczne checkboxy (wyłącznie odcinki obecne i dozwolone w Jellyfin), zapisywane z `seasons[].episodes[].number`.
- Każdy zapis wymaga wyraźnego zatwierdzenia; brak scrobblowania i synchronizacji podczas oglądania.
- Backend blokuje `/update` z SeasonId. `POST /season-history` wymaga prawidłowego, autoryzowanego rodzica i sezonu oraz waliduje numery pojedynczych odcinków.
- Osobny Simkl CSS i JS; nie modyfikowano MAL.

## Odczyty
Przy pierwszym otwarciu sezonu dla danego użytkownika dołączany jest pojedynczy pełny stan obejrzanych odcinków z Simkl (`extended=full&include_all_episodes=yes`), później zapytania są przyrostowe (`date_from`) po sprawdzeniu `/sync/activities`. To może oznaczać większe jednorazowe zapytanie. Jeśli Simkl ograniczy rozmiar odpowiedzi, pojawi się błąd odczytu, bez wysłania zmian.

## Testy i ograniczenia
Testy są statyczne oraz JS w środowisku symulowanym. Nie potwierdzają powodzenia zdalnych zapisów na prawdziwym koncie ani kompilacji DLL na Jellyfin 12.4; po instalacji trzeba sprawdzić serial wielosezonowy oraz zgodność numeracji sezonów Jellyfin/Simkl.

Źródła API: https://api.simkl.org/guides/mark-as-watched, https://api.simkl.org/guides/sync, https://api.simkl.org/api-reference/simkl/remove-from-history
