# MisioFlix Native 0.4.39.0 — licznik rewatch MAL i oryginalne karty AnimePL

## 1. Odczyt MyAnimeList — naprawa na podstawie rzeczywistej diagnostyki

Raport dla MAL ID 1195 potwierdził:
- `GET anime/1195?fields=my_list_status` — HTTP 200, 13 odcinków, **bez pola** `num_times_rewatched`;
- `GET anime/1195?fields=my_list_status{status,score,num_episodes_watched,num_times_rewatched,is_rewatching}` — HTTP 200, **13 odcinków oraz 6 powtórek**.

`MisioFlixMalService.ReadItemAsync` używa teraz drugiego, jawnego selektora, sprawdzonego w diagnostyce. Niczego nie pobiera przez scraping strony HTML. Brak pola nadal jest traktowany jako nieznany, nie jako zero. Zapis PATCH, odświeżanie na żądanie oraz uprawnienia użytkownika nie są zmieniane.

Lokalny cache szczegółów MAL: nowy klucz `misioflix-mal-v3`, aby stary wpis „Brak danych” nie zasłaniał nowego odczytu. Globalny indeks MAL i pamięć powiązań z NFO pozostają nietknięte. Strona główna nie wykonuje nowego zapytania przy każdym kafelku.

## 2. AnimePL #/mixed — wygląd sprawdzonej 0.4.29

Zrezygnowano z uproszczonej prezentacji v0.4.37–0.4.38. Widok natywnej biblioteki korzysta znów z **tego samego** niewchodzącego w interakcje zestawu nakładek `.mf-native-overlay` co v0.4.29 i inne biblioteki Jellyfin:
- osobne odznaki `ANIME`, rok i typ;
- niebieska i pomarańczowa łapka przy liczbie sezonów/odcinków;
- trzy oddzielne znaczniki gatunków pochodzące z NFO;
- opis NFO pod plakatem;
- osobista ocena MAL w zestawie statystyk, jeśli została pobrana;
- ramki anime zależne tylko od statusu MAL danego użytkownika (nie od znacznika odtworzenia Jellyfin).

Zachowane są prawdziwe karty, ich odnośniki, lista, filtr i natywny scroller Jellyfin. Dodano uwzględnienie wirtualizowanych kafelków używanych ponownie dla innych anime. Inne biblioteki i odtwarzacz bez zmian.

## 3. Panel szczegółów

Usunięto zbędną rubrykę „Obejrzane: Tak/Nie” — informację już podaje Status. `Ponowne obejrzenia` pokazują dosłownie `num_times_rewatched` (np. 6), bez +1. `Obejrzane odcinki` pozostają osobnym licznikiem (np. 13).

## Testy

- 162 testy Python, 2 testy Node — zaliczone lokalnie.
- Chromium: rok, gatunki, łapki, opis, ocena i ramka MAL, ponowne użycie kafelka, brak zmiany oryginalnego linku — zaliczone w odtworzonym DOM.
- Brak kompilatora .NET 10 oraz rzeczywistego Jellyfin 12.4 w środowisku. Kompilacja i scroll na NAS-ie wymagają potwierdzenia.
