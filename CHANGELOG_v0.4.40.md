# MisioFlix v0.4.40.0 — kompaktowy MAL i poprawki kart na Androidzie

## Strony anime i sezonów
- Przeniesiono panel MAL do lewej kolumny bezpośrednio pod „Oglądaj pierwszy odcinek” / „Kontynuuj oglądanie”.
- Na komputerze: kompaktowe 4 pola (ocena, status, ponowne obejrzenia, obejrzane odcinki) w siatce 2 × 2 i zwijany edytor.
- Na ekranach do 850 px: domyślnie zwinięty przycisk „MAL”; kliknięcie rozwija informacje i osobny przycisk „Edytuj MAL”.
- Usunięto prezentację „MAL ID: ... · Ten tytuł / Ten sezon” i sekcję „Diagnostyka MAL” z interfejsu. Backend diagnostyki pozostaje zabezpieczony, ale klient nie wykonuje żadnych zapytań diagnostycznych.
- Po **udanej** odpowiedzi na „Zapisz w MAL” pojawia się jednoznaczne potwierdzenie „✓ Zapisano zmiany w MyAnimeList”. Edytor zamyka się po udanym zapisie; przy błędzie nie wyświetla się fałszywe potwierdzenie.
- Ramka plakatu w szczegółach anime/sezonu: różowa (nieobejrzane), złota (w trakcie), zielona (obejrzane). Status pochodzi wyłącznie z MAL użytkownika; brak danych pozostaje bez statusowej ramki.

## Karty anime
- W karuzelach strony głównej i w wyszukiwarce anime ocena użytkownika MAL jest pokazywana jako **liczba + różowa łapka** (bez „/10”). Dla natywnych kart biblioteki również pozostaje liczba + różowa łapka.
- W widoku `#/mixed` na telefonie ukryto redundantny znaczek „ANIME”, ale nie rok, statystyki, gatunki ani tytuł.
- Statystyki sezonów, odcinków i oceny zajmują mniej miejsca; rok pozostaje pełny przy małej szerokości.
- Niewielkie zmniejszenie tytułu i opisu, żeby pokazać więcej opisu bez poszerzania kafelków.
- Kolory ramki mobilnej biblioteki anime pochodzą z MAL, nie z „obejrzane” Jellyfin.

## Nienaruszone komponenty
- Identyfikacja MAL z `season.nfo` / NFO, autoryzacja per użytkownik, dwukierunkowy zapis i pełny odczyt `num_times_rewatched` z v0.4.39.
- Odtwarzanie natywne Jellyfin, przycisk kontynuacji, inne biblioteki, oryginalne linki kart i natywne przewijanie `#/mixed`.
- `build.yml`, `release.yml`, Client ID/Secret i konfiguracja OAuth.

## Walidacja lokalna
- 170 testów Python oraz 2 testy Node; kontrola składni JavaScript.
- Testy Chromium z symulowanym Jellyfin/MAL: 390 px Android, ukrycie „ANIME”, rok, trzy łapki, węższy licznik, ramka, toast po zapisie, panel MAL na dole plakatu, zwijanie na telefonie oraz różowa łapka przy ocenie w karuzeli i wyszukiwarce.
- Brak kompilacji .NET i testu na fizycznym NAS; wymagają GitHub Actions i instalacji.
