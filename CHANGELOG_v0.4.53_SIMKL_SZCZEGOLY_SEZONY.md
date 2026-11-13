# MisioFlix Native v0.4.53.0 — poprawki ramek Simkl i widoku oceny

Baza: v0.4.52.0. Stabilna v0.4.45.0 pozostaje nietknięta.

1. **Szczegóły filmu, serialu, sezonu**: ramka Simkl jest zakotwiczona do `detailImageContainer`, a nie całej strony. Niezależny pseudo-element pozwala zachować dzieloną złoto-zieloną ramkę.
2. **Karty sezonów seriali spoza AnimePL**: pobierany jest dokładny `SeriesId` i numer `IndexNumber` z Jellyfin; karta sezonu sprawdza odpowiednią pozycję w rzeczywistych pozycjach „Oglądaj dalej” (nie NextUp) i pokazuje złotą ramkę, lub złoto-zieloną, gdy obejrzany sezon ma nowe wznowienie. Inne sezony pozostają niezależne.
3. **Ocena w nagłówku szczegółów**: tylko liczba/„Bez oceny” i różowa łapka, bez redundantnego napisu Simkl; element rozciąga się do wysokości sąsiednich przycisków.
4. **Izolacja**: własne klasy `mf-simkl-*` i atrybuty; bez zmian MAL, odtwarzacza, synchronizacji Simkl i GitHub Actions.

Zmiana interfejsu nie modyfikuje statusów obejrzenia w Jellyfin ani Simkl.
