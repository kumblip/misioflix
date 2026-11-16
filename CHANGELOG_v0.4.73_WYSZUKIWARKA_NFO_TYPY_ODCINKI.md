# MisioFlix Native v0.4.73.0 — rzeczywiste typy anime i liczba odcinków w podpowiedziach

Podstawa: pełna paczka **MisioFlix Native v0.4.72.0** (najnowsza paczka dostarczona w rozmowie).

## Wyszukiwarka anime

- W wynikach rozwijanych pod polem wyszukiwania dla poszczególnych sezonów usunięto sztywny opis `Sezon / Specials`. Zamiast niego pokazywana jest rzeczywista wartość `<tag>Typ: ...</tag>` pobrana z lokalnego `season.nfo` (np. `Seria TV`, `ONA`, `OVA`, `Special`).
- W tym samym wierszu pokazano liczbę **odcinków danej pozycji**, a nie całej serii. Odmiana po polsku: `1 odcinek`, `2 odcinki`, `13 odcinków`.
- Karty pod polem wyszukiwania zachowują niebieską łapkę liczby odcinków; nie wyświetlają fałszywej liczby sezonów.
- Serwer korzysta najpierw z `RecursiveItemCount`, a przy jego braku w sezonie może użyć `ChildCount` (dane Jellyfin). NFO udostępnia typ i nazwy, ale nie zawiera wiarygodnego licznika faktycznie obecnych odcinków.
- Jeśli NFO nie określa typu, wyświetla się `Sezon (brak typu w NFO)`, nie zmyślona kategoria `Special`.
- Zmieniono podpis przełącznika na `Pokaż osobne części anime` oraz filtru na `Sezony / OVA / ONA / Specials`. Filtr filmowy opisano wyłącznie jako `Filmy`, bo źródłowy typ Jellyfin `Movie` nie obejmuje wszystkich OVA/ONA.
- Bez zmian: przełącznik po włączeniu pokazuje same osobne sezony, po wyłączeniu nadrzędną serię; dodatkowe jawne filtry typów mogą świadomie łączyć wyniki.

## Przykład Arifureta z 5 rzeczywistych NFO

| Pozycja | Wartość `<tag>Typ: ...</tag>` | Liczba odcinków w bibliotece według danych przykładowych v0.4.72 |
| --- | --- | ---: |
| Prologue (2020) | `ONA` | 1 |
| Sezon z 2019 | `Seria TV` | 13 |
| 2nd Season (2022) | `Seria TV` | 12 |
| Yorimichi (2022) | `Special` | 1 |
| Season 3 (2024) | `Seria TV` | 16 |

Liczby odcinków są odczytywane z metadanych Jellyfin, nie z tagów `season.nfo`.

## Bezpieczeństwo i zgodność

Nie modyfikowano plików NFO, bibliotek ani multimediów. Nie modyfikowano MAL, Simkl, bazy Jellyfin, odtwarzania ani strony szczegółów. Jedyny zapis poza kodem wyszukiwarki to numer wersji w `meta.json`/`csproj` i testy regresji.
