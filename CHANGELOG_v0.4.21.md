# MisioFlix Native v0.4.21.0 — kompaktowe strony szczegółów

## Nowy układ filmów, seriali, sezonów i odcinków

- **Bez dużego górnego banera**: na zmodyfikowanych stronach szczegółów ukrywamy tło `#itemBackdrop` i ozdobne `.detailLogo`; tytuł, daty i pozostałe dane przenoszą się do góry.
- **Plakat po lewej**: zachowana jest oryginalna karta/obraz Jellyfin, z istniejącymi metadanymi i obsługą obrazów. Układ dopasowuje się do węższych okien.
- **Pod plakatem**: pojawia się karta „Kontynuuj oglądanie” dla rozpoczętego odcinka, „Oglądaj następny odcinek” po ukończeniu wcześniejszego lub „Oglądaj pierwszy odcinek” dla nowej serii. Działa na poziomie całej serii, również przy przechodzeniu pomiędzy sezonami. Korzysta z postępu bieżącego użytkownika Jellyfin przez `/MisioFlix/api/resume`; w przypadku braku postępu wybiera pierwszy istniejący odcinek z `/Shows/{id}/Episodes`.
- **Film/odcinek**: karta pod plakatem używa oryginalnego przycisku odtwarzania/wznawiania na bieżącej stronie.
- **Sezony, odcinki, Specials i dodatkowe części**: oryginalne elementy Jellyfin pozostają klikalne; są teraz wyświetlane w prawej części strony pod metadanymi.
- **Obsada**: nie zajmuje miejsca na dole strony, dopóki użytkownik nie kliknie przycisku „Obsada” pod metadanymi i gatunkami. Obsada i goście zachowują natywne karty.
- **Więcej podobnych**: wyświetlanych jest maksymalnie pięć propozycji.

## Bez zmian

- Brak modyfikacji plików oryginalnego Jellyfin Web, portu 8096 i odtwarzacza.
- Nie zmieniono `home.js`, mechanizmu wyszukiwarek, losowania, ukrywania i usuwania z „Oglądaj dalej”.
- Zachowany jest działający tryb awaryjny z v0.4.20, polegający na nawigacji do właściwego odcinka i kliknięciu natywnego przycisku odtwarzania. Wersja **nie** obiecuje naprawienia wcześniejszej nieskutecznej próby natywnego startu bez nawigacji.
- Zachowana jest izolacja CSS na ekranie odtwarzania (naprawa czarnego obrazu z v0.4.17).
- Nie trzeba zmieniać `.github/workflows/build.yml` ani `release.yml`.

## Testy

- 63/63 testy Python, 2 skrypty Node.
- Lokalny test Chromium z szablonem DOM Jellyfin: układ, ukrycie banera, resume S3:E4, przewijane sezony, zwijana obsada, 5 podobnych, odtwarzanie dokładnego odcinka przez mechanizm awaryjny, przywrócenie widoku przy przejściu na stronę osoby.
- Nie przeprowadzono kompilacji DLL ani testu integracyjnego na NAS; wymaga sprawdzenia w Jellyfin 12.4.

### Dopracowanie na podstawie prawdziwego HTML Jellyfin 12.4 (przed wdrożeniem)
- Strona szczegółów jest wybierana po identyfikatorze tytułu z natywnego przycisku `btnPlaystate`, a nie wyłącznie pierwszym `#itemDetailPage`. Ogranicza to ryzyko użycia nieaktualnego widoku przy nawigacji SPA.
- Ten sam wybór aktywnego widoku jest używany do naciskania natywnego przycisku odtwarzania.
- Przycisk „Obsada” nie pojawia się, kiedy Jellyfin ma w DOM jedynie pustą, ukrytą sekcję. Pojawi się po załadowaniu rzeczywistych kart osób.
- Zweryfikowano prawdziwe klasy: `.detailPagePrimaryContainer`, `.detailRibbon`, `.detailPagePrimaryContent`, zagnieżdżone `#listChildrenCollapsible`, `#castCollapsible`, `#similarCollapsible` oraz `.btnPlay[data-action="resume"]`.
- Dodano testy regresji aktywnego widoku i pustej obsady; nie zmieniano wersji ani plików workflow.
