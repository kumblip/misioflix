# MisioFlix Native v0.4.120.0 — gatunki 150% na komputerze

- W widoku komputerowym (min. 921 CSS px) etykiety **gatunków na plakatach** są 1,5 raza większe względem v0.4.119: tekst **11,5 → 17,25 px**, a odstępy, marginesy wewnętrzne i zaokrąglenia proporcjonalnie powiększone.
- Dotyczy etykiet na natywnych kafelkach Jellyfina (`.mf-native-genre`) oraz kafelkach MisioFlix (`.mf-home-genre`): biblioteki, strona główna, propozycje, kolekcje, wyszukiwarki, pełne listy gatunków.
- Zachowano zwykły przepływ flex i zawijanie etykiet (bez `transform: scale()`, który mógłby powodować kolizje).
- **Telefony i aplikacje mobilne pozostają bez zmian** (poniżej 921 CSS px). Nie zmieniono rozmiarów plakatów, liczby kafelków, przycisków „i”, łapek, statusów MAL/Simkl ani mechanizmu 10 + 25 + 25 doładowywania.
- Tylko CSS, numer wersji, changelog i testy. Żadnych zmian JS, API, .NET poza numerem wersji, workflow GitHub, MAL lub Simkl.
