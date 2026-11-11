# MisioFlix Native v0.4.22.0 — Oglądaj dalej, Wstecz i gatunki

## Zmiany

1. **Strona główna → Oglądaj dalej:** kliknięcie kafelka uruchamia ten sam, przetestowany mechanizm co przycisk pod plakatem na stronie szczegółów: przechodzi do dokładnego filmu/odcinka (według `resumeId`) i klika natywne Jellyfin `btnResume` / `btnPlay` po załadowaniu szczegółów. Zrezygnowano z niepewnych prób `playbackManager.play()` oraz syntetycznych przycisków. Zachowano awaryjny wariant oczekiwania na natywny przycisk. Przy tytule całej serii nie uruchamia jej strony informacyjnej.
2. **Wstecz:** przycisk `← Wstecz` powyżej zwartego układu każdej strony filmu, serialu, sezonu i odcinka. Korzysta z historii przeglądarki przy normalnej nawigacji; wejście bez zapisanego poprzedniego widoku wraca do strony głównej.
3. **Bez Wylosuj:** natywny `btnShuffle` jest ukryty wyłącznie na stronach szczegółów. `Losuj` oraz `Ostatnio dodane` na stronie głównej pozostają bez zmian (5 losowych pozycji).
4. **Gatunki:** kliknięcie gatunku w natywnych metadanych przenosi do modalnej wyszukiwarki MisioFlix z konkretnym gatunkiem zaznaczonym na zielono.
   - Anime: klasyfikacja oryginalnego tytułu przez autoryzowane, niewielkie API `/MisioFlix/api/overlays`, oparte na `AnimeRoot` oraz lokalnych NFO; filtrowanie wyłącznie w katalogu anime, dokładnie spośród 52 ustalonych gatunków.
   - Filmy i seriale: to samo przejście, lecz tylko do wyszukiwarki nie-anime, z gatunkami z przypisanych metadanych Jellyfin.
   - Rozróżnienie **nie zależy od nazwy gatunku** (np. „Akcja” występuje w obu bibliotekach). Jeśli klasyfikacja jest niedostępna, nie następuje błędne przekierowanie do wspólnej listy.
5. **Zachowano:** układ szczegółów v0.4.21 (plakat po lewej, sezony po prawej, składana obsada, maks. 5 podobnych), izolację CSS odtwarzacza, kontrolki historii, trójstanowe filtry, wyszukiwanie Speciali, pięć losowań i ciągłą listę „Oglądaj dalej”.

## Weryfikacja

- 75/75 aktywnych testów Python oraz 2/2 skrypty Node.
- Test Chromium na uproszczonej stronie odpowiadającej strukturze Jellyfin 12.4: `Wstecz` działa, `btnShuffle` jest ukryty, otwierają się dwie różne wyszukiwarki z zielonym filtrem „Akcja”, a wyniki są rozdzielone na anime i nie-anime.
- Test Chromium: kliknięcie kafelka „Oglądaj dalej” z `resumeId` prowadzi do natywnego `btnPlay` konkretnego odcinka (test S1:E3) i przechodzi do widoku odtwarzania.

**Granice testów:** brak kompilacji DLL, brak dostępu do rzeczywistego NAS/Jellyfin; przejście przez podstronę odcinka może być chwilowo widoczne do czasu zadziałania natywnego przycisku. Te wyniki nie potwierdzają jeszcze działania v0.4.22 na produkcji.
