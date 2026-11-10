# MisioFlix Native v0.4.2.0 — aktualizacja kodu na GitHub

Repozytorium: https://github.com/kumblip/misioflix  
Serwer docelowy: Jellyfin 12.4.0 na UGREEN, port 8096.  
Ta paczka jest **poprawką ŹRÓDEŁ**, nie skompilowaną wtyczką DLL. Do publikacji używaj istniejącego workflow GitHub Actions.

## Przesłanie

1. Rozpakuj ZIP na komputerze.
2. Prześlij **zawartość** archiwum do głównego katalogu `kumblip/misioflix`, zachowując ścieżki `src/...` i `tests/...`; przy zamianie istniejących plików potwierdź nadpisanie.
3. Zapisz commit na gałęzi `main`, np. `feat: MisioFlix Native 0.4.2 - paw badges, watch states, resume list`.
4. Wejdź w **Actions → MisioFlix - build dla Jellyfin 12.4**. Kompilacja .NET 10 oraz testy muszą zakończyć się zielonym wynikiem. Jeśli wystąpi błąd, nie publikuj wydania i prześlij log błędu do poprawy.
5. Po sukcesie w **Actions → MisioFlix - opublikuj wydanie dla Jellyfin → Run workflow → main** wpisz `PUBLIKUJ`. Powinno powstać wydanie `v0.4.2.0` z paczką `MisioFlix_0.4.2.0_JF12.4.zip`. Workflow zaktualizuje `manifest.json`.
6. W Jellyfin → **Wtyczki → Katalog → MisioFlix** wybierz nową wersję `0.4.2.0`, zainstaluj i dopiero wtedy uruchom ponownie **wyłącznie** kontener Jellyfin. Odśwież stronę `Ctrl+Shift+R`.

Nie modyfikuj ręcznie `manifest.json`, `release.yml` ani obecnych plików NFO. Nie instaluj źródłowego ZIP-a w Jellyfin. Nie usuwaj konfiguracji ani starych wtyczek.

## Karty — co zmieniono

- Plakat i cienki obrys: **jasnoróżowy** nieobejrzane (`#F3A8CF`), **bursztynowy** rozpoczęte (`#E5A340`), **zielony** obejrzane (`#42B875`). Stan wyliczany per użytkownik z Jellyfin UserData; dla seriali preferowany `UnplayedItemCount` wraz z liczbą odcinków.
- W lewym górnym rogu duży typ (`ANIME`, `FILM`, `SERIAL`), pod nim nieco większy niż dotąd rok + format.
- W prawym górnym rogu wąski wspólny panel z delikatną ramką i tłem z **20% przezroczystości**. Liczba jest pierwsza, po niej **mała kolorowa kocia łapka**. Sezony: pomarańczowa, odcinki: niebieska, ocena: różowa. Odcinki i sezony powyżej 99: `99+`.
- Film ma tylko ocenę, bo nie ma sezonów i odcinków. Przy brakującej ocenie nie wymyślamy wartości; panel nie pokazuje tej statystyki.
- Max trzy najpopularniejsze gatunki na dole plakatu, dwulinijkowy tytuł i czterolinijkowy opis **pod** plakatem. Plakat 2:3.
- Ocena anime czytana **tylko z lokalnego NFO** (`<rating>` lub `<ratings>`). Jeśli NFO nie zawiera oceny, łapka oceny nie pojawia się. Dane o liczbie odcinków/sezonów to techniczne dane strukturalne Jellyfin, nie opisowe metadane anime.

## „Oglądaj dalej” — co zmieniono

- Górna plansza pozostaje kompaktowa, ale karuzela obejmuje **wszystkie otrzymane** niedokończone produkcje, bez limitu trzech widocznych na raz. Backend stronicuje do 3000 wpisów z Jellyfin; interfejs przewija poziomo.
- Łączy `UserItems/Resume` z `Shows/NextUp`, więc seria po zakończonym odcinku może wskazać kolejny.
- Po kliknięciu `×` pozycja zostaje ukryta **tylko dla danego konta** w MisioFlix — nie kasujemy postępu oglądania w Jellyfin ani nie oznaczamy jako obejrzanej.
- Przycisk `Ukryte` pozwala przywrócić pozycję. Stan ukrycia jest zapisany osobno w trwałym katalogu Jellyfin: `/config/data/misioflix/hidden-resume.json` (w kontenerze), niezależnie od NFO i plików mediów. Musi być zapisywalny przez proces Jellyfin.

## Sprawdzenie / ograniczenia

- **15 testów lokalnych Python/Node.js zaliczonych** i `node --check` bez błędów.
- Kompilacja DLL **nie była wykonywana lokalnie** (w środowisku brak .NET 10). Pierwszym krokiem walidacji jest GitHub Actions; zielony build nadal nie gwarantuje poprawności zachowania na realnym Jellyfin.
- Nie testowano jeszcze zrzutów danych UserData dla Twojej biblioteki, rzeczywistych liczników i odtwarzania w mobilnych aplikacjach.
- Podczas zamykania odtwarzacza nadal wykorzystywany jest mechanizm przejścia do Jellyfin z wersji 0.4.1. Ta aktualizacja nie obiecuje automatycznego wznowienia odtwarzania jednym kliknięciem.
- Jeżeli Jellyfin nie udostępni `UnplayedItemCount`, `RecursiveItemCount`, `ChildCount` lub `CommunityRating`, nie zgadujemy liczników ani ocen. Dostosujemy odczyt po obejrzeniu odpowiedzi API na Twoim NAS-ie.
