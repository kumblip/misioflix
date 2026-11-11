# Wdrożenie MisioFlix Native v0.4.21.0

**Wymagania:** istniejące repozytorium `kumblip/misioflix` po aktualizacji v0.4.20; Jellyfin 12.4.x; działające workflow z naprawy CI v0.4.19.

1. Pobierz ZIP źródłowy v0.4.21 i **rozpakuj go na komputerze**.
2. Wgraj pliki z archiwum do **głównego katalogu** istniejącego repozytorium na GitHub, zachowując podfoldery `src/...`, `tests/current/...` i `tools/...` (nie twórz dodatkowego katalogu `MisioFlix_v0.4.21` w repozytorium). Podmień istniejące pliki.
3. **Nie podmieniaj ani nie dodawaj** `.github/workflows/build.yml` i `release.yml`. Wykrywanie nowych testów i numer wersji z `meta.json` pozostają automatyczne.
4. Po udanym GitHub Actions → Build pobierz wygenerowaną **paczę instalacyjną DLL** `MisioFlix_0.4.21.0_JF12.4.zip` z artefaktów. Źródłowy ZIP z tej rozmowy nie jest instalatorem Jellyfin.
5. Zaktualizuj wtyczkę Jellyfin w używany przez Ciebie sposób, wykonaj restart kontenera i odśwież stronę przez `Ctrl+F5`.

## Test na NAS

- Otwórz stronę całej serii, która ma rozpoczęty odcinek z sezonu innego niż pierwszy: pod plakatem powinno się pokazać „Kontynuuj oglądanie” i poprawny numer Sx:Ey.
- Kliknij kartę: przeglądarka może **na moment otworzyć szczegóły odcinka** i powinna automatycznie nacisnąć jego oryginalny przycisk „Wznów” lub „Odtwórz”. To obecnie znany działający mechanizm awaryjny.
- Otwórz serię, której nie rozpoczęto: pod plakatem powinien pojawić się pierwszy odcinek, a sezony i dodatki powinny być po prawej.
- Otwórz film i konkretny odcinek: sprawdź, czy karta pod plakatem uruchamia natywny przycisk, a górny pasek z odtwarzaniem i statusem nadal działa.
- Rozwiń i zwiń „Obsada”, sprawdź limit pięciu „Więcej podobnych”.
- Sprawdź odtwarzanie filmu i odcinka, aby upewnić się, że nie wrócił czarny ekran.

## Diagnostyka

Jeżeli na stronie nie ma nowego układu, sprawdź aktualną wersję wtyczki (0.4.21.0), wymuś odświeżenie cache i w F12 → Network sprawdź, czy `MisioFlix/assets/details.js` zwraca HTTP 200. Jeśli karta pod plakatem nie znajdzie odcinka, proszę o Console i Network dla `/MisioFlix/api/resume` oraz `Shows/{id}/Episodes`; nie wklejaj tokenów autoryzacyjnych.

### Wariant dopracowany na podstawie zrzutu HTML
Ten ZIP **zastępuje wcześniejszy ZIP v0.4.21**. Ponieważ poprzedniego wydania jeszcze nie wgrano, numer wersji pozostaje `0.4.21.0`.
Wgraj komplet plików do repozytorium, zachowując ścieżki. `build.yml` i `release.yml` pozostają bez zmian.
Zrzut HTML nie jest dołączany do archiwum; został użyty wyłącznie do weryfikacji struktury strony.
