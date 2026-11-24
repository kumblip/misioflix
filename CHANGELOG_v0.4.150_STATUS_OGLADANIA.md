# MisioFlix 0.4.150.0 — status oglądania w propozycjach

Baza: 0.4.149.0 KOMPATYBILNOŚĆ CI FIX. Bez zmian w mechanizmie plakatów, MAL, SIMKL, wyszukiwarki, NFO, odtwarzania i diagnostyki.

- Nowy przełącznik po napisach, w dotychczasowej palecie zielony/niebieski/pomarańczowy: Wszystkie (domyślnie), Nieobejrzane (nierozpoczęte), Rozpoczęte (nieukończone).
- Status z danych bieżącego użytkownika Jellyfin; dla seriali wykorzystuje liczbę nieobejrzanych odcinków i częściowo obejrzane odcinki. Nie synchronizuje ani nie interpretuje statusów MAL/SIMKL.
- Osobny autoryzowany odczyt tylko po aktywacji filtra, bez obrazów, bez odczytu NFO i bez zapisu historii. Bez sztywnego limitu tytułów; statusy nie korzystają ze starego cache wyszukiwarki. Brak statusu nie oznacza nieobejrzanego tytułu.
- Wynik łączy wszystkie istniejące warunki przed losowaniem i stronicowaniem. Podczas odczytu zachowane karuzele są ukryte; po otrzymaniu statusów aktualizowane są różnice. Błędy odczytu pokazują opcję ponowienia.
- Odczyt po przejściu z Wszystkie do Nieobejrzane oraz po powrocie do widocznej karty z aktywnym filtrem. Na nowym montowaniu Home domyślnie Wszystkie. Statusy tylko w pamięci, bez nowej bazy i bez trwałego zapisu preferencji. Pełna lista gatunku korzysta z aktualnego wyniku w momencie otwarcia.
- Testy lokalne: 611 Python, 79 skryptów Node. Kompilacja .NET 10 i test na NAS nie zostały wykonane w tym środowisku.
