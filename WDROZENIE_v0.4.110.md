# Wdrożenie MisioFlix v0.4.110.0

## Aktualizacja z v0.4.109.0

1. Skopiuj zawartość paczki `MisioFlix_Native_v0.4.110_TYLKO_ZMIANY_OD_109.zip` do katalogu głównego aktualnego repozytorium, zachowując strukturę folderów i nadpisując zmienione pliki.
2. Uruchom dotychczasowy, niezmieniony workflow `build`. Po potwierdzeniu poprawnej kompilacji uruchom `release` dla wersji `v0.4.110.0`.
3. Zainstaluj/zaaktualizuj wtyczkę przez Jellyfin i zrestartuj serwer, jeśli tego wymaga aktualizacja.
4. W ustawieniach MisioFlixa otwórz „Propozycje według gatunków”. Chwyć `⠿`, przenieś dowolny zestaw i wybierz **Zapisz propozycje**. Po odświeżeniu panelu sprawdź kolejność.
5. U dołu konfiguracji sprawdź przycisk „Wróć do MisioFlix — widok ogólny wtyczki”.
6. W bocznym menu administratora Jellyfin powinny być dwa wpisy: „MisioFlix — ustawienia” oraz „MisioFlix”. Pierwszy prowadzi do konfiguracji, drugi do ogólnego widoku wtyczki. Sprawdź też przycisk „Konfiguruj” na stronie wtyczki.
7. Na stronie głównej włącz „Pokaż propozycje”. Kliknij tytuł karuzeli (np. „Akcja”), przewiń pełną listę, zamknij ją i sprawdź działanie zwykłego kafelka.

## Zakres scalonego wydania

Wszystkie zmiany planowane wcześniej do v0.4.110 i v0.4.111 znajdują się w tej **jednej wersji v0.4.110.0**; nie trzeba wgrywać v0.4.111 ani robić dwóch publikacji.

## Regresja i uwagi

- Nie trzeba ponownie konfigurować propozycji ani MAL/Simkl.
- Widoczność bibliotek, propozycji oraz uwzględnianie anime pozostają niezależnymi przełącznikami.
- Pierwotne limity w głównych karuzelach bibliotek pozostają nienaruszone. Pełne listy dotyczą nowych karuzel propozycji.
- Link do ogólnego widoku ma względny adres `#/dashboard/plugins/97d15b37b868492b83daeb67b16a0d44?name=MisioFlix`, zachowujący aktualny host i protokół (LAN, Tailscale, domena).
- GitHub Actions bez zmian.
