# Instalacja testowa MisioFlix Native v0.4.46.0

## 1. Utwórz aplikację Simkl

Otwórz https://simkl.com/settings/developer/ i utwórz aplikację **AUTH V2**, typu **TV, devices & command line**.
Skopiuj **Client ID**. Nie udostępniaj nikomu tokenów dostępu lub odświeżania; żadnych tokenów nie umieszczaj w GitHubie.

## 2. Zbuduj DLL

Rozpakuj pełne repozytorium do nowej gałęzi GitHub lub nadpisz zgodne pliki z paczki `TYLKO_ZMIANY`, zachowując ich katalogi.
Zatwierdź zmiany w GitHub. Workflow zbuduje wersję wskazaną w `meta.json` — nie trzeba ręcznie edytować pliku Actions.
Pobierz artefakt DLL i zainstaluj zgodnie z dotychczasowym sposobem aktualizacji MisioFlix w Jellyfin. Uruchom ponownie Jellyfin.

## 3. Skonfiguruj moduł

W Panel administracyjny Jellyfin → Wtyczki → MisioFlix w nowej sekcji **Simkl** wprowadź **AUTH V2 Client ID**, zapisz.
Na stronie głównej MisioFlix kliknij **Połącz Simkl**. Wybierz **Rozpocznij łączenie Simkl**, wpisz kod na https://simkl.com/pin, zatwierdź dostęp `media:read media:write`, potem kliknij **Sprawdź zatwierdzenie** (po wskazanym odstępie).
Konto jest osobne dla każdego zalogowanego użytkownika Jellyfin. Przy odłączeniu tracisz wyłącznie lokalne połączenie, nie historię Simkl.

## 4. Sprawdź odczyt i ręczny zapis

1. Wejdź do szczegółów filmu (np. ze znanym IMDb ID). Panel `Moje Simkl` powinien pojawić się pod plakatem, a `Moje MyAnimeList` — nie.
2. Wejdź do serialu i sezonu. Status jest wspólny dla serialu, a liczba obejrzanych odcinków pochodzi z Simkl.
3. Wejdź do AnimePL — panel Simkl nie powinien pojawić się; dotychczasowy panel MAL bez zmian.
4. Zmień status lub ocenę na stronie Simkl przez przeglądarkę; kliknij `Odśwież z Simkl` w szczegółach i sprawdź odczyt.
5. Dopiero po otwarciu `Edytuj Simkl`, zmianie pola i kliknięciu `Zapisz w Simkl` wraz z potwierdzeniem wtyczka wysyła zmianę do Simkl.
6. Odtwórz film/odcinek bez użycia `Edytuj Simkl` i sprawdź, że lista Simkl pozostała bez zmian.
7. Sprawdź też poprzednie funkcje: MAL, różową/złotą/zieloną ramkę, biblioteki, odtwarzanie i liczniki sezonów.

**Ważne:** Simkl wymaga ID TMDB/IMDb/TVDB dla bezpiecznego dopasowania. Brak ID w Jellyfin oznacza brak automatycznego dopasowania po podobnej nazwie.

## 5. Powrót do stabilnej v0.4.45.0

Oryginalny plik `MisioFlix_Native_v0.4.45_GitHub_PELNE.zip` jest niezależną zachowaną kopią.
Przywróć repozytorium z tego archiwum, uruchom workflow, zainstaluj wygenerowany DLL i zrestartuj Jellyfin. Sprawdź SHA-256 z `STABLE_BASELINE_v0.4.45_SHA256.txt`.

Dane Simkl trzymane są w prywatnym folderze danych wtyczki na NAS (`misioflix/simkl`) poza źródłami GitHub. Nie są umieszczane w ZIP-ach.
