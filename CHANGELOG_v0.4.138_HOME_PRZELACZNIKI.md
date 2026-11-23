# MisioFlix Native — planowane wydanie v0.4.138.0 — przełączniki Home

Zmiana **wyłącznie wizualna** w `Web/theme.css`. Bazą jest obecna wersja `0.4.137.0`.

- **Zielony (stany domyślne)**: Propozycje, Uwzględnij anime (włączone), Audio PL, Napisy Wszystkie.
- **Niebieski (stany alternatywne)**: Biblioteki, Uwzględnij anime (wyłączone), Audio nie-PL, Napisy PL.
- **Pomarańczowy (trzeci stan)**: Audio Wszystkie, Napisy EN.
- Zielone stany startowe mają suwak **po prawej**. W trójstanowych filtrach niebieski pozostaje pośrodku, a pomarańczowy jest po lewej.
- Na szerokich ekranach cały pasek jest wyrównany **do prawej**. Na węższych ekranach wraca wyrównanie do lewej i poziome przewijanie, żeby pierwszy przycisk był dostępny.
- Kolor i ramka ikony `CC` przy „Napisy Wszystkie” są zielone.
- Wspólna paleta CSS ogranicza rozbieżności i powielanie reguł.
- Nowy test `tests/current/home_switch_palette_138.cjs` sprawdza kolory, położenie suwaka, responsywność i niezmienione domyślne stany JS.

**Bez zmian**: filtrowanie materiałów, role bibliotek, rozdzielenie anime od innych produkcji, MAL, SIMKL, wtyczki Jellyfin, serwerowa baza języków, odtwarzacz, sesje, NFO, zapis ustawień, manifest wydań.

**Numeracja**: Repozytorium ma wersję `0.4.137.0` w `meta.json` aż do publikacji. Istniejący workflow `release.yml` wywołuje `tools/next_release_version.py`, który ustawia następny wolny numer wydania — obecnie `0.4.138.0`. Nie podbijaj ręcznie `meta.json` przed uruchomieniem workflow, bo otrzymasz kolejny numer.

**Weryfikacja**: `python3 tools/run_tests.py`; finalna kompilacja DLL jest wykonywana przez GitHub Actions. Przed publikacją sprawdź wizualnie przyciski w Jellyfin Web (desktop i mobile).
