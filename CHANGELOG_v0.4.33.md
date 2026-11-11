# MisioFlix Native 0.4.33.0 — osobiste oceny i statusy MAL

## Widok anime / sezonu
- Panel MyAnimeList otwiera się jako czytelne podsumowanie: osobista ocena 0–10, status na MAL, ukończenie, pełne obejrzenia i obejrzane odcinki.
- Edycja w formularzu **Edytuj MAL** jest zwinięta; otwarcie panelu niczego nie zapisuje.
- Oddzielny przycisk **Odśwież z MAL**; zapisywanie tylko po kliknięciu **Zapisz w MAL**.
- Po zapisie aktualizują się podsumowanie, oznaczenie oceny oraz lokalna pamięć stanu.
- Zamiast społecznościowej oceny Jellyfin w szczegółach anime jest pokazywana **osobista ocena MAL** (dla tytułów z poprawnym MAL ID).
- MAL status `completed` to ukończone; `watching` i `on_hold` to w trakcie; `plan_to_watch` i `dropped` to nieukończone. W razie braku wiarygodnego wpisu MAL nie zgadujemy na podstawie Jellyfin.
- Pełne obejrzenia = pierwsze ukończenie + `num_times_rewatched`; gdy brak potwierdzenia ukończenia i powtórek, licznik wynosi 0.

## Karuzele i biblioteki
- Dla anime ramki i osobiste oceny pochodzą z **MAL bieżącego użytkownika Jellyfin**, nie z `Played` ani `UserData.Rating` Jellyfin.
- Stare źródło danych pozostaje dla filmów i zwykłych seriali.
- Identyfikatory MAL odczytywane są z NFO, w tym z `season.nfo` sezonu 1, gdy seria nie ma własnego ID.
- Po pierwszym wejściu w szczegóły anime pobierany jest **jeden zbiorczy, cache'owany stan listy użytkownika**. Na stronie głównej nie ma żądań do MAL dla poszczególnych plakatów. Snapshot jest zachowywany lokalnie oddzielnie dla kont użytkowników Jellyfin.
- Po zapisaniu lub ręcznym odświeżeniu anime jego widoczny stan aktualizuje się bez pobierania wszystkich plakatów.
- Pozycje niepowiązane jeszcze z wiarygodnym MAL ID mają ramkę neutralną, a nie fałszywy status z Jellyfin.

## Bez zmian
Oryginalny odtwarzacz Jellyfin, ścieżki NFO, OAuth, tajny sekret na serwerze, workflow GitHub, wyświetlanie osobnych filmów i seriali, strony kolekcji, Ulubione.

## Testy
56/56 testów źródłowych (odtworzony, dostępny zestaw), Node `--check` dla trzech zmodyfikowanych skryptów i test Chromium na zasymulowanych API: odczyt, edycja, zapisywanie, cache, ramki i brak pytań do MAL na głównej.

**Nie przeprowadzono kompilacji DLL ani testu na rzeczywistym NAS-ie.**
