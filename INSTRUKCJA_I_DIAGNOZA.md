# MisioFlix — naprawa rozpoznawania Anime PL i flag audio (ta sama niewgrana wersja)

## Co zmieniono

1. Katalog propozycji rozpoznaje anime po **tym samym ID i roli biblioteki**, z których korzystają karuzele strony głównej. Zmiana nazwy lub ścieżki biblioteki nie powinna już błędnie klasyfikować anime jako zwykłego serialu.
2. Wyłączony przełącznik **Uwzględnij anime** filtruje również wpisy, które w starym katalogu mają `anime:false`, lecz należą do bieżącej biblioteki o roli anime.
3. Flagi nadal pochodzą wyłącznie z istniejącego indeksu `language-flags-index.json`. Domyślny język roli `anime_pl` / `anime_eng` pomaga rozpoznać **pojedynczą ścieżkę audio** przy jej nieprawidłowym/brakującym oznaczeniu. Przy kilku ścieżkach wymagana jest wiarygodna identyfikacja poszczególnych języków.
4. Pustych lub nierozpoznanych informacji o dźwięku nie uznaje się za dowód braku polskiego audio. Takie wpisy pozostają „nieustalone”, zamiast trafiać do „Audio nie-PL”.
5. Skanowanie ręczne agreguje języki z odcinków do sezonu i całego serialu nawet wtedy, gdy odpowiedź API odcinka nie zawiera `SeriesId`, ale sezon zawiera `ParentId`.
6. Zmieniono nazwę przestrzeni cache katalogu w przeglądarce, aby unieważnić stare dane o klasyfikacji anime/audio.
7. Zachowano filtry audio i napisów, ikonę CC, obsługę `movie.nfo` / `tvshow.nfo` / `season.nfo`, karuzele, MAL/Simkl, numerowanie wydań i konfigurację innych bibliotek.

## Jak wgrać przez stronę GitHub

1. Użyj **tylko nowego ZIP-a** `MISIOFLIX_ANIME_I_AUDIO_POPRAWKA_JEDEN_BUILD_GITHUB.zip` zamiast poprzednich niewgranych łatek. Rozpakuj go lokalnie.
2. Wgraj pliki z rozpakowanych folderów do identycznych ścieżek w repozytorium `kumblip/misioflix` przez interfejs WWW GitHuba (nie przesyłaj samego ZIP-a do repozytorium).
3. Uruchom zwykły workflow w GitHub Actions. Numer wersji w źródłach pozostawiono taki jak w niewgranej paczce — mechanizm publikacji automatycznej pozostał bez zmian.
4. Po wdrożeniu otwórz **MisioFlix → Flagi PL / ENG — dźwięk i napisy** i naciśnij przycisk ręcznego **odświeżenia indeksu**. Jest to potrzebne: wcześniejsze błędne wyniki są zapisane trwale i sama wymiana plików nie przebudowuje indeksu.
5. Przeładuj stronę główną w przeglądarce. Sprawdź `Saikyou Onmyouji no Isekai Tenseiki (2023)` przy `Audio PL`, a potem wyłącz `Uwzględnij anime` i sprawdź, czy zniknie z propozycji.

## Ograniczenia i diagnoza

- Nie mam dostępu do Twojej rzeczywistej bazy `language-flags-index.json`, pliku wideo ani konfiguracji ścieżek audio na NAS-ie. Nie mogę zatem potwierdzić, jak jest zakodowana ścieżka w konkretnym anime. Gdy ma kilka ścieżek i polska nie jest oznaczona, bez diagnostyki ścieżek nie wolno jej zgadywać. W takim przypadku wynik może być „nieustalony”, nie „Audio PL”.
- Po odświeżeniu indeksu spójrz na flagę na plakacie. Brak flagi PL pomimo poprawnego audio oznacza problem z rozpoznaniem strumieni w Jellyfin, a nie wyłącznie przełącznik propozycji.
- Dostępne testy automatyczne: **587/587 Python**, **65/65 Node**. Kod JavaScript przeszedł kontrolę składni. Środowisko nie ma `dotnet`, więc nie skompilowano .NET 10 i nie przeprowadzono testu na Twoim NAS-ie.
- Nie zmieniono danych media/NFO, żadnych użytkowników, MAL/Simkl ani ręcznej/automatycznej numeracji wydań.
