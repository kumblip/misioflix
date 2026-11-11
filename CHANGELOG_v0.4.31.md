# MisioFlix Native v0.4.31.0 — stabilny panel MyAnimeList

## Naprawiony problem

W v0.4.30 panel „Moje MyAnimeList” mógł stale migać na stronie anime/sezonu i ponawiać odczyt „Sprawdzanie MAL ID z NFO…”. Przy błędnej odpowiedzi katalogu lub nierozpoznanym typie poprzedni skrypt usuwał panel (`panel.remove()`); obserwator zmian DOM tworzył go od nowa, powtarzając zapytania. Częste przebudowy widoku Jellyfin także restartowały odczyt.

## Zmiany

- Jeden współdzielony odczyt na **użytkownika Jellyfin + identyfikator pozycji**; kolejna inicjalizacja panelu odzyskuje wynik lub stan trwającego zapytania zamiast ponownie wysyłać żądania.
- Przy błędzie HTTP, braku MAL ID lub nierozpoznaniu NFO panel pokazuje komunikat zamiast usuwać się i zapętlać. Ponowienie następuje **wyłącznie po kliknięciu „Ponów sprawdzanie”**.
- Trwałość formularza po ponownym zamontowaniu panelu przez React; zapis/odświeżenie aktualizuje stan pamięci.
- Lokalny cache MAL na użytkownika i MAL ID zachowany (godzina świeżości), bez zapytań o listę anime przy wejściu na stronę główną.
- Limit oczekiwania na odczyt metadanych/katalogu Jellyfin: 30 s z komunikatem błędu.
- Natywny sezon nadal wykorzystuje **swój** MAL ID z `season.nfo`, seria MAL ID z właściwego NFO.
- Zabezpieczenie przed jednoczesnym włączeniem starych i nowych skryptów MAL w tej samej karcie.

Nie zmieniano OAuth, konfiguracji klienta i sekretu, danych kont MAL, historii odtwarzania Jellyfin, bibliotek, NFO, układu strony głównej, odtwarzacza ani workflow GitHub.

## Weryfikacja lokalna

- 136/136 testów Python i 2/2 skrypty testowe Node.
- Chromium: odpinanie panelu wielokrotnie podczas odczytu, jeden zestaw wywołań; stabilny formularz.
- Chromium: odpowiedź 404 nie wywołuje pętli, a ręczne „Ponów” wykonuje jedną nową próbę.
- Chromium: osobny MAL ID sezonu.

Nie wykonano kompilacji DLL ani rzeczywistego połączenia z MAL na NAS-ie.
