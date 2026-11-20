# MisioFlix Native v0.4.113.0 — kompaktowy baner i mobilne karuzele

**Baza:** v0.4.112.0. Zmiany są ograniczone do interfejsu strony głównej, dokumentacji i testów. Odtwarzacz, NFO, MAL, Simkl, wyszukiwarki i ich katalog pozostają bez zmian.

## Baner strony głównej

- Usunięto tekst: „Twój świat filmów i anime” oraz „Własna biblioteka. Oryginalny odtwarzacz Jellyfin.”
- Logo i przyciski są teraz obok siebie w jednym, znacznie niższym kontenerze; na wąskich ekranach przyciski zawijają się do kolejnych wierszy.
- Przyciski bibliotek są alfabetyczne według polskiej kolejności, włącznie z linkiem „Kolekcje”.
- Na końcu znajdują się kolejno „Wyszukiwarka anime”, „Wyszukiwarka filmów i seriali”, MAL oraz Simkl. Kolejność MAL/Simkl jest zabezpieczona przez `order` w CSS, niezależnie od momentu wczytania modułu.
- Pionowy padding przycisków zmniejszono z 8 px do 6 px u góry i u dołu, a minimalną wysokość z 40 do 36 px. Dla telefonów przyjęto jeszcze bardziej kompaktowy rozmiar.

## Rozmiar karuzel na telefonie (Android, iOS i przeglądarka)

- W trybie do 680 px karuzele bibliotek i propozycji mieszczą trzy kafelki w szerokości obszaru (na wzór wyszukiwarki anime); dalsze kafelki przesuwa się poziomo.
- Kafelki zachowują plakaty, łapki, ramki statusów MAL/Simkl, rok i gatunki, lecz korzystają z mniejszych rozmiarów oznaczeń jak w wyszukiwarce.
- Pod plakatem pozostaje jednowierszowy, skracany wizualnie tytuł oraz przycisk „i”. Opis nie jest widoczny na kafelku mobilnej karuzeli, ale zachowuje się w danych oraz w oknie podglądu otwieranym przyciskiem „i”.
- Zmiana nie dotyka wyszukiwarki, pełnej listy kolekcji, natywnych kafelków Jellyfina ani kart na komputerze.

## Bez zmian

Limit pierwszego pobrania **10 pozycji na karuzelę** i nieskończone doładowywanie z v0.4.112 pozostają bez zmian. Domyślnie włączone propozycje i istniejący przełącznik bibliotek również pozostają jak dotąd. Żaden plik GitHub Actions nie został zmieniony.

## Testy

494 testy Pythona oraz 58 skryptów Node.js: PASS. Testy obejmują faktyczne wywołanie funkcji sortowania przycisków i budowania banera, selektory mobilnych kafelków, metadane wydania oraz dotychczasowe regresje. Test Chromium w kontenerze nie został ukończony (przekroczenie czasu); nie wykonano też kompilacji .NET 10 ani testu na NAS-ie, dlatego końcowy efekt wizualny należy sprawdzić na urządzeniu.
