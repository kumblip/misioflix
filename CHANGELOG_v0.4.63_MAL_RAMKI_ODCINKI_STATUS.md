# MisioFlix Native v0.4.63.0 — poprawka wizualna ramek anime

## Problem w v0.4.62

Gdy w MyAnimeList tytuł/sezon miał status **Obejrzane**, a licznik obejrzanych wynosił 24/24, poszczególne odcinki nadal bywały różowe, ponieważ v0.4.62 wymagała oddzielnego znacznika `UserData.Played` z Jellyfina. Dodatkowo `malResumeEpisodes` nie otrzymywał identyfikatorów odcinków z rzeczywistej listy wznowienia.

## Poprawa

* MAL `completed` dla zweryfikowanego wpisu sezonu → **wszystkie odcinki tego sezonu mają zieloną ramkę**, niezależnie od znaczników ✓ Jellyfina.
* MAL `completed` + konkretny odcinek występuje w aktywnym `Oglądaj dalej` z `position_ticks > 0` i nie jest `NextUp` → **ramka złoto-zielona tylko tego odcinka**.
* Nieukończony MAL: pojedynczy odcinek ✓ w Jellyfinie → zielona; aktywne wznowienie bez ✓ → złota; w przeciwnym razie różowa. Bez odgadywania odcinków na podstawie globalnego licznika MAL.
* Bez wysyłania do MAL, bez zmiany liczników, bez ustawiania ✓ w Jellyfinie, bez zmian Simkl.

## Wdrożenie

Wgraj `TYLKO_ZMIANY` do GitHuba, zachowując strukturę folderów. Po przejściu testów i `dotnet publish` w GitHub Actions zainstaluj nową DLL i wyczyść cache przeglądarki, jeśli stary skrypt pozostaje w pamięci. Checkpoint v0.4.59 bez zmian.
