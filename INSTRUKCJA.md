# MisioFlix — dwustanowy wybór: Propozycje / Biblioteki

## Instalacja

To jest **skumulowana paczka względem ostatniej poprawki CI i audio anime** w tej samej wersji źródłowej. Obejmuje zmianę przełącznika i wszystkie pliki poprzedniej paczki. Dla repozytorium starszego niż ta paczka dołączono osobno pełne źródła projektu; sama łatka nie musi zawierać każdej zmiany z dużo wcześniejszych aktualizacji.

1. Rozpakuj `MISIOFLIX_PROPOZYCJE_BIBLIOTEKI_PRZELACZNIK_2_STANY_JEDNA_LATKA_GITHUB.zip` na komputerze.
2. Przez interfejs WWW repozytorium GitHub `kumblip/misioflix` prześlij pliki do identycznych katalogów (zachowaj ścieżki i nadpisz wcześniejsze wersje tych plików). Nie wrzucaj samego ZIP-a jako jednego pliku repozytorium.
3. Po zapisaniu zmian sprawdź GitHub Actions. Pliki workflow i numer wersji nie są zmieniane.
4. Po instalacji odśwież stronę główną Jellyfina (w razie potrzeby twarde odświeżenie przeglądarki).

## Nowe zachowanie

- Na stronie głównej działa tylko **jeden** przełącznik widoku zamiast `Pokaż biblioteki` i `Pokaż/Ukryj propozycje`.
- **Zielony `💡 Propozycje`** to stan domyślny przy otwarciu strony: widoczne tylko karuzele propozycji, a biblioteki ukryte.
- Po kliknięciu włącza się **niebieski `📚 Biblioteki`**: karuzele bibliotek są widoczne, a propozycje ukryte.
- Kolejny klik przywraca stan zielony, zawsze widoczna jest dokładnie jedna grupa karuzel.
- Nie ma pamięci ustawienia między wejściami na stronę główną: stan domyślny zawsze Propozycje (zgodnie z zamówieniem).
- Pozostają osobne filtry `Uwzględnij anime`, `Audio PL / Audio nie-PL / Wszystkie`, `Wszystkie / Napisy PL / Napisy EN` z ikoną CC. Ich ustawienia i logika nie zostały zmienione.
- Nie zmieniono zawartości żadnego katalogu, NFO, MAL, Simkl, flag, panelu administracyjnego, integracji Jellyfin, automatycznego numerowania wydań ani workflow GitHub.
- Emoji w tej wersji: 💡 / 📚. Pozostałe propozycje do ewentualnej podmiany: ✨ / 🗂️, 🎯 / 📚.

## Zmodyfikowane pliki

- `src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs`
- `src/Jellyfin.Plugin.MisioFlix/Web/home.js`
- `src/Jellyfin.Plugin.MisioFlix/Web/theme.css`
- `tests/current/card_info_default_111.cjs`
- `tests/current/genre_recommendations_107.cjs`
- `tests/current/home_libraries_toggle_106.cjs`
- `tests/current/proposal_anime_library_id_audio_repair.cjs`
- `tests/current/proposal_audio_tristate.cjs`
- `tests/current/proposal_empty_rows_109.cjs`
- `tests/current/proposal_sets_108.cjs`
- `tests/current/proposal_subtitles_tristate.cjs`
- `tests/current/test_anime_dual_root_105.py`
- `tests/current/test_anime_library_audio_repair.py`
- `tests/current/test_card_info_default_111.py`
- `tests/current/test_genre_recommendations_107.py`
- `tests/current/test_home_libraries_toggle_106.py`
- `tests/current/test_library_paths_dynamic.py`
- `tests/current/test_proposal_audio_tristate.py`
- `tests/current/test_proposal_sets_108.py`
- `tests/current/test_proposal_subtitles_tristate.py`

## Weryfikacja

- `node --check src/Jellyfin.Plugin.MisioFlix/Web/home.js`: OK.
- `node --check src/Jellyfin.Plugin.MisioFlix/Web/client.js`: OK.
- `python3 tools/run_tests.py`: 587/587 testów Python i 65/65 skryptów Node — OK.
- Zaktualizowano istniejące testy starego dwukontrolkowego interfejsu, sprawdzając teraz realny, nowy dwustanowy przycisk oraz wzajemne wykluczenie obu rodzajów karuzel.
- Nie wykonano kompilacji .NET 10 ani testów uruchomieniowych na Twoim NAS-ie.

### Uwaga

Ta łatka jest **skumulowana** z bezpośrednio poprzednią poprawką audio/anime/CI. Obejmuje zarówno 9 plików zmienionych w tej iteracji, jak i pozostałe pliki ostatniej paczki. Jeśli repozytorium nie ma jeszcze zmian ze starszych etapów prac, zamiast zakładać kompletność małej łatki, porównaj je z udostępnionym ZIP-em pełnego źródła (zawartość katalogu `misioflix-main/` odpowiada katalogowi głównemu repozytorium).
