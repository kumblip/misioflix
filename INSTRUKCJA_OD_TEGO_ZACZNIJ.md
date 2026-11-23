# MisioFlix — dwie niezależne karuzele „Kolekcje” i kompaktowe ustawienia

Data: 23 listopada 2026 r.  |  Wariant: z flagami PL/ENG  |  Baza: ostatnie pełne źródła „WSZYSTKIE BIBLIOTEKI — JEDEN MECHANIZM”.

## Cel

1. Zachować osobną wirtualną karuzelę **Kolekcje — globalne** (ID `collections`, endpoint `/MisioFlix/api/home/collections`).
2. Wyświetlać również rzeczywistą bibliotekę **Kolekcje — biblioteka Jellyfina**, z jej **własnym GUID** (przykładowo `435afda8be42a960916c3d81ea610983`) i standardowym endpointem `/MisioFlix/api/home/shelf?libraryId=...`. Nie pobiera ona domyślnie globalnego widoku; nie nadpisuje go ani nie scala.
3. Zapisywać widoczność i kolejność obu wpisów **osobno** (`HomeCarouselOrder`, `HiddenHomeCarousels`). Odznaczenie jednego nie wpływa na drugi.
4. Skrócić panel ustawień: węższa szerokość maksymalna, mniejsze marginesy, zwijane wiersze bibliotek, krótsze karuzele i rozwijana pomoc. Zachować wszystkie pola, przyciski, role i integracje.

## Co zostało zmienione

- `src/Jellyfin.Plugin.MisioFlix/Web/home.js` — dopuszcza `collections` w rzeczywistych bibliotekach użytkownika, zachowując niezależny syntetyczny wpis `collections`; rozróżnia endpointy i linki dla obu karuzel.
- `src/Jellyfin.Plugin.MisioFlix/Web/configPage.html` — zwarte style i zwijane ustawienia bibliotek; wizualne rozróżnienie globalnych i fizycznych kolekcji; `Edytuj ścieżki` otwiera i rozwija odpowiednią bibliotekę.
- testy `tests/current/` — kontrola obu źródeł, zapisu, nawigacji i braku regresji paginacji.

## Wgrywanie **wyłącznie przez GitHub WWW**

1. Zachowaj kopię obecnego działającego commita / brancha.
2. Rozpakuj **LATKA_GITHUB.zip** — nie wgrywaj samego ZIP-a do repozytorium.
3. W GitHub → `src/Jellyfin.Plugin.MisioFlix/Web` → `Add file → Upload files` podmień `home.js` i `configPage.html`.
4. W GitHub → `tests/current` zastąp pliki testów z łatki.
5. Zatwierdź zmiany na `main` i sprawdź testy w **Actions**. Dopiero po zielonej kompilacji uruchom workflow publikowania kolejnej wersji.
6. W Jellyfinie po aktualizacji wtyczki wejdź: MisioFlix → Ustawienia → `Karuzele strony głównej`, kliknij `Odśwież listę karuzel`, ustaw oba pola „Kolekcje”, wybierz kolejność i kliknij `Zapisz kolejność i widoczność karuzel`. Odśwież główną stronę.

## Jak działa druga karuzela

- „Kolekcje — globalne” pokazuje BoxSety z całej biblioteki dostępne dla użytkownika.
- „Kolekcje — biblioteka Jellyfina” pokazuje BoxSety ze **wskazanej biblioteki** przy użyciu jej identyfikatora i filtrów dostępu Jellyfina.
- Jeżeli Jellyfin nie zwróci fizycznej biblioteki użytkownikowi w `/Users/{id}/Views`, karuzela nie jest udostępniana przez obejście uprawnień; wpis administracyjny może pozostać widoczny, ale nie będzie samodzielnego źródła danych. Należy wtedy zweryfikować widoczność tej biblioteki dla użytkownika.
- Żadnych usunięć ani zmian kolekcji, NFO, plakatów, integracji MAL/Simkl i flag.

## Walidacja

- Lokalne testy źródłowe: **569/569 Python**, **61/61 Node** — PASS.
- Sprawdzony podgląd interfejsu Chromium przy 1150 i 420 px; brak przewijania poziomego w obu.
- **Nie wykonano** rzeczywistej kompilacji .NET ani testu na NAS-ie Jellyfin; te dwa etapy pozostają do sprawdzenia w GitHub Actions i po instalacji.
- Mechanizm numerowania wersji i `.github/workflows` **nie został zmieniony**.
