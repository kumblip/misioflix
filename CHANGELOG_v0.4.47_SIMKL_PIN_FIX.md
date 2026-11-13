# MisioFlix Native v0.4.47.0 — hotfix Simkl AUTH V2

Bazowa wersja funkcjonalna: v0.4.46.0 beta, bez modyfikacji wersji stabilnej v0.4.45.0.

## Problem

W Jellyfin domyślny profil JSON zachowuje PascalCase dla właściwości rekordów C#.
Kontroler zwracał obiekty SimklPin/SimklConnection/SimklPoll i zagnieżdżony
SimklEntry bez jawnego mapowania nazw. JavaScript odczytywał `code`, `uri`,
`connected` itd. Efektem był pusty PIN i link `/web/undefined`, a w przyszłości
mogły być niewidoczne dane profilu (ocena, status, obejrzane odcinki).

## Rozwiązanie

- Kontroler Simkl zwraca jawne nazwy pól lowerCamelCase na wszystkich czterech
  odczytach: `/connection`, `/connect`, `/poll`, `/item` (także `entry`).
- Ekran logowania wymaga poprawnego PIN; zamiast linku z niezaufanej odpowiedzi
  używa stałego HTTPS `https://simkl.com/pin/`.
- Żadnych zmian w MAL, działających ramkach, logice oglądania, innych panelach,
  CSS, serwisie Simkl ani workflow GitHub Actions.
- Żaden proces oglądania nie zapisuje danych do Simkl: nadal tylko wyraźna edycja.

## Sprawdzenie

Testy kontraktu API oraz bezpieczeństwa linku, plus istniejące testy projektu.
Brak możliwości uruchomienia serwera Jellyfin / kompilacji .NET w tym środowisku;
po instalacji sprawdzić cały przepływ PIN i status konta na żywym serwerze.
