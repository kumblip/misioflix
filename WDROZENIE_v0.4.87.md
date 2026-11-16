# MisioFlix v0.4.87 — wdrożenie

1. Wgraj pełne źródła na GitHub (zachowaj `.github/workflows`).
2. Zaczekaj na zielony `dotnet publish` w Actions, a następnie opublikuj Release standardową procedurą.
3. Zaktualizuj wtyczkę, zrestartuj Jellyfin i wykonaj Ctrl+F5 w Edge.
4. Uruchom odcinek, przyciskiem „Następny” przejdź do kolejnego, następnie kliknij w odtwarzaczu „Wstecz”.
5. Oczekiwany widok: szczegóły ostatnio odtwarzanego odcinka, u góry strony, z ponownie pobranym statusem i postępem. Sprawdź też zwykłą nawigację `Wstecz` w szczegółach i w wyszukiwarkach.
6. Gdy nie zadziała, sprawdź logi serwera dla `MisioFlixNextEpisodeWatchService` i konsolę `[MisioFlix Player Back]`.

Nie zastępuje natywnego playera. W przypadku braku danych z odtwarzania pozostawia natywny Jellyfin Back.
