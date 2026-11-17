# MisioFlix Native v0.4.96.0 — synchronizacja dwukierunkowa kolekcji NFO

## Co zmieniono od v0.4.95

1. Usunięcie `<set>Marvel</set>` w poprawnym `movie.nfo` / `tvshow.nfo` usuwa **wyłącznie wcześniej zarządzane przez MisioFlix powiązanie** danej produkcji z natywnym BoxSetem Marvel. Fizyczne media i NFO nie są modyfikowane.
2. Pusty BoxSet jest usuwany, jeśli wtyczka ma trwały zapis GUID potwierdzający, że **sama go utworzyła**, i Jellyfin potwierdza zero przechowywanych linków. Ręcznie utworzone BoxSety są chronione. Weryfikowany jest również katalog kolekcji Jellyfina, aby nie usunąć plików multimedialnych.
3. Wprowadzono trwały rejestr `misioflix/collections/nfo-collections-state.json` pod `IApplicationPaths.DataPath` serwera Jellyfin. Zapis atomowy po zmianie; pozostaje po restarcie. Rejestr przechowuje identyfikatory tworzonych BoxSetów, kontrolowane powiązania oraz cache NFO z czasem modyfikacji i rozmiarem. Podczas cyklicznych przebiegów pomija niezmienione NFO, lecz co 24 godziny wymusza ponowny odczyt całego XML, także jeśli inne narzędzia zachowały czas pliku.
4. Zachowano harmonogram start +2 minuty, następnie co 30 minut, a także ręczne uruchomienie w panelu admina. Przy niepełnej liście produkcji, błędnym NFO, utracie dysku lub nieprawidłowym stanie rejestru wtyczka **nie usuwa** powiązań ani BoxSetów.
5. Powtórzone `<sorttitle>` mapowane są do `<set>` **po kolejności występowania**, tylko jeśli liczba obu typów tagów jest równa. Dla BoxSetów utworzonych przez MisioFlix ustawiana jest per-kolekcja kolejność manualna (`DisplayOrder=Default`, uporządkowane `LinkedChildren`). Globalny `SortName` produkcji w Jellyfinie nie jest zmieniany przez wtyczkę. Ręcznie utworzone BoxSety nie mają narzucanego porządku.
6. Status panelu administracyjnego zawiera teraz liczby: usunięte powiązania, usunięte puste kolekcje i ustawione kolejności.

## NFO z wieloma kolekcjami i numeracją

```xml
<movie>
  <set>Marvel</set>
  <set>Avengers</set>
  <sorttitle>Marvel 002</sorttitle>
  <sorttitle>Avengers 004</sorttitle>
</movie>
```

`Marvel` i `Avengers` są **oddzielnymi natywnymi BoxSetami**. Jeśli program utworzył je sam, utrzymuje kolejność według własnych kluczy w każdym BoxSecie. Nie zapisuje dodatkowych pól `sorttitle` do filmowego NFO — Jellyfin ma jedno globalne pole SortName i oddzielny porządek linków wewnątrz każdej kolekcji. Kolejność manualna jest widoczna wtedy, gdy klient Jellyfina respektuje domyślną kolejność BoxSetu, a nie wymusza inne sortowanie.

## Pierwsze uruchomienie po v0.4.95

Wersja v0.4.95 nie tworzyła rejestru własności. Wersja v0.4.96 może zaadaptować **aktualnie istniejące i nadal oznaczone tagami NFO** powiązania, ale nie potrafi rozpoznać wstecz członkostwa, którego tag usunięto, zanim został utworzony rejestr. Nie przejmuje też historycznych BoxSetów automatycznie, aby nie usuwać ręcznie utworzonych kolekcji. Takie osierocone historyczne kolekcje można jednorazowo uporządkować ręcznie.

## Ważne ograniczenia

- Zmiana linków i kasowanie pustych BoxSetów są operacjami w Jellyfinie. Przed wdrożeniem wykonaj kopię katalogu danych/konfiguracji kolekcji Jellyfina.
- Gdy w bibliotekach jest włączony zapis metadanych NFO przez **samego Jellyfina**, Jellyfin może zapisywać NFO niezależnie od MisioFlix. Wtyczka nie modyfikuje NFO.
- Wielokrotny `<sorttitle>` nie jest standardowym per-kolekcja polem Jellyfina. Wtyczka mapuje go konwencją pozycyjną.
- Brak lokalnego .NET SDK — kompilację API oraz zachowanie w działającym Jellyfinie 12.4 potwierdza GitHub Actions i test na NAS-ie.
