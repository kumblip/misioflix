# MisioFlix Native v0.4.54.0 — obramowania pojedynczych odcinków Simkl

Baza: v0.4.53.0. Punkt przywracania: v0.4.45.0 (bez zmian).

- W szczegółach sezonu każdy rzeczywisty odcinek ma własną ramkę (różowa / złota / zielona / pół złota i pół zielona) wokół jego wiersza, bez obramowania całego panelu sezonów.
- Obejrzenie odcinka bazuje na osobistej historii Simkl tego sezonu (z lokalnej kopii na NAS-ie); w przypadku braku wpisu Simkl używany jest stan Played z Jellyfin.
- Rozpoczęty odcinek jest określany wyłącznie przez rzeczywisty `id` w aktywnej liście „Oglądaj dalej”, bez wpisów NextUp.
- Mapowanie odcinków pobierane z Jellyfin Shows/{seriesId}/Episodes i przypisane do konkretnego identyfikatora oraz numeru odcinka; nie propagujemy statusu serialu na wszystkie odcinki.
- Osobne znaczniki CSS `mf-simkl-episode-row` i `data-mf-simkl-episode-watch`; bez ingerencji w MAL, system odtwarzania, sync i GitHub Actions.
- Działa również przy zmianie strony oraz odświeżeniu historii Simkl. Ramki nie blokują kliknięcia odcinka.

**Walidacja:** testy automatyczne kodu Python i Node. Nie przeprowadzono lokalnej kompilacji .NET 10 ani testu na NAS-ie.
