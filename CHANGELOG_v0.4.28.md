# MisioFlix Native v0.4.28.0 — lista kolekcji i nawigacja bibliotek

## Zmiany

1. **Kolekcje — przycisk w banerze.** Otwiera oddzielną listę wszystkich rzeczywistych kolekcji Jellyfin (`BoxSet`) pod adresem `#/home?mfCollections=1`, zamiast przewijać stronę do karuzeli.
2. **Kolekcje — tytuł karuzeli.** Klikalny nagłówek prowadzi do dokładnie tej samej listy.
3. **Pełna lista.** Responsywna siatka kart z plakatami, gatunkami, liczbą filmów oraz przyciskiem „Pokaż kolejne”. Jednorazowo pobierane jest maksymalnie 24 kolekcji z autoryzowanego endpointu MisioFlix. Karta otwiera oryginalne szczegóły kolekcji Jellyfin.
4. **Powrót.** Lista kolekcji ma przycisk „← Strona główna”. Przycisk „Strona główna” w natywnych bibliotekach umieszczono w lewym dolnym rogu, aby nie zasłaniał „Foldery”, sortowania ani filtrów.
5. **Regresje.** Zachowano oddzielne wyświetlanie filmów i seriali, niezmienione gatunki NFO, karuzele AnimePL i Kolekcje, ulubione Jellyfin oraz istniejącą obsługę odtwarzania.
6. **Testy.** Dodano `test_collections_directory_0428.py`; dostosowano dawny test z v0.4.27, aby nie wymagał konkretnego numeru wersji ani przycisku przewijającego karuzelę.

## Uwagi techniczne

- Nie zmieniono `.github/workflows/build.yml`, `.github/workflows/release.yml` ani plików Jellyfin Web.
- Oddzielny widok kolekcji wykorzystuje trasę strony głównej z parametrem `mfCollections=1`, nie przejmuje natywnych widoków Jellyfin ani nie wymaga biblioteki typu BoxSets.
- Test lokalny Chromium obejmował 32 przykładowe kolekcje, paginację 24+8, przejścia Home ↔ Kolekcje, Ulubione i AnimePL. To nie jest test na NAS-ie.
