# MisioFlix Native v0.4.10.0 — układ bliżej oryginalnego MisioFlix

## Co zmieniono

- Pozostawiono oryginalny Jellyfin Web: karty, linki, logowanie, bibliotekę, sezony, nawigację i odtwarzacz.
- Na desktopie ukryto powtórzony blok **Moje multimedia**; oryginalne biblioteki nadal są dostępne w pasku górnym.
- Istniejącą sekcję **Kontynuuj odtwarzanie** wystylizowano jako kompaktowy hero MisioFlix. Nie pobiera się drugiej listy.
- W sekcji AnimePL — ostatnio dodane istniejące karty serii i sezonów otrzymują portretowy format okładki. Poziome miniatury odcinków pozostają poziome.
- Przy obrazach nie będących Primary można użyć istniejącego obrazu Primary danego tytułu (gdy serwer potwierdza jego obecność). W tym przypadku przeglądarka musi pobrać obraz Primary; nie ma jednak powtórnego pobierania całej biblioteki.
- Na oryginalnych kartach: typ, rok i format w lewym górnym rogu, maks. 3 gatunki z NFO na dole plakatu, trzy stany cienkich ramek oraz wspólny panel liczb i kocich łapek.
- Dodano czteroliniowy opis **pod tytułem**, pobierany z NFO dla anime lub Jellyfin dla pozostałych mediów. Dane są wstawiane bezpiecznie jako zwykły tekst.
- Usunięto powtórzony rok pod tytułem, gdy ten sam rok jest już na plakacie.
- Poprawiono obsługę kilku widocznych kart tego samego tytułu podczas uzupełniania metadanych.
- Poprawiono workflow testów: PostCSS jest instalowany przed testem CSS.

## Świadome ograniczenia

- Wtyczka nie tworzy ponownie własnej wyszukiwarki NFO ani osobnego ekranu MAL na stronie głównej. Integracja MAL serwera pozostaje, ale UI natywne szczegółów MAL wymaga kolejnego etapu.
- Użytkownicy bez ocen osobistych nie zobaczą łapki z oceną; oceny społecznościowe nie są używane jako zamiennik.
- Natywne „Kontynuuj odtwarzanie” nadal korzysta z listy Jellyfin; ukrywanie pojedynczych pozycji i gwarancja obecności wszystkich porzuconych serii nie zostały w tym wydaniu przebudowane.
- Weryfikacja na realnym Jellyfin 12.4 wymagana. Lokalne testy nie zastępują kompilacji C# ani testów przeglądarkowych na NAS.
