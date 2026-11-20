# MisioFlix Native v0.4.115.0 — biblioteki mobilne i przycisk „i”

Baza: **v0.4.114.0**.

## Zmiany

1. **Telefon, Android i iOS — natywne biblioteki Jellyfina (`#/mixed`, `#/list`, `#/movies`, `#/tv`)**: brak opisu pod plakatem, brak zarezerwowanej wysokości opisu, tytuł do dwóch linii, przycisk `i` po prawej stronie. Zachowano dotychczasowe trzy kafelki w rzędzie i oryginalne ramki/paws.
2. **Pozostałe mobilne kafelki MisioFlixa**: karuzele bibliotek, propozycje, pełne wyniki gatunków i wyszukiwarki pokazują tytuły do dwóch linii zamiast jednej. Opisy pozostają ukryte w karuzelach, zgodnie z wcześniejszą konfiguracją.
3. **Komputer — natywne biblioteki**: dodano rzeczywiście działający przycisk `i` do oryginalnych kart Jellyfina, a nie tylko do kafelków `.mf-home-card`. Przycisk korzysta z istniejącego okna informacji: plakat, pełna nazwa, gatunki, opis, **Otwórz**, **Zamknij**. Nie zastępuje natywnego linku do szczegółów.
4. Dla okna informacji natywnych kart endpoint dekoracji udostępnia komplet gatunków; wizualnie na plakacie pozostają **maksymalnie trzy** gatunki.

## Zasady bezpieczeństwa i kompatybilności

- Nie zmieniono zapisów MAL/Simkl, NFO, odtwarzacza, list, paginacji ani GitHub Actions.
- Element natywny `i` nie przenosi i nie zastępuje żadnego elementu React/Jellyfin; jest osobnym przyciskiem obok zawartości.
- Przy ponownym wykorzystaniu tego samego kafelka przez Jellyfin podgląd odczytuje **aktualny** identyfikator, pełny tytuł i metadane, nie poprzedniego elementu.

## Testy

- 502 testy Python, 59 skryptów Node.js — zaliczone.
- Nie wykonano kompilacji .NET 10 ani testu na rzeczywistej aplikacji Jellyfin Android/iOS; ostateczny wygląd wymaga weryfikacji po instalacji.
