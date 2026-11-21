# MisioFlix Native v0.4.116.0

Baza: v0.4.115.0.

- Android/iOS: zmniejszenie poziomych odstępów w karuzelach bibliotek i propozycji z 8 do 4 px, przy zachowaniu dokładnie trzech kafelków na ekranie.
- Android/iOS: zmniejszenie wewnętrznych marginesów podpisów i przycisków informacji, dając więcej miejsca na tekst.
- Naprawa konfliktu CSS: wcześniejsze `white-space:nowrap!important` blokowało dwie linie tytułów w karuzelach oraz w widoku pełnego gatunku. Reguła o równie wysokiej swoistości wymusza teraz 2 linie.
- Pełny widok Kolekcji na mobilnym Jellyfin: 3 kompaktowe kafelki w wierszu, bez opisów, z dwuwierszowym tytułem oraz przyciskiem „i”. Skalowanie oznaczeń na plakatach odpowiada karuzelom.
- Natywne biblioteki Jellyfin: redukcja paddingu poziomego kart i podpisu. Nie modyfikowano wirtualizacji, struktury React, URL-i, odtwarzania, MAL, Simkl ani logiki stanów.
- Nie zmieniono automatycznego ładowania po 10 pozycji, doładowywania, konfiguracji propozycji, ani GitHub Actions.

Weryfikacja: uruchomić `python tools/run_tests.py`. Testy na urządzeniu Android/iOS po wdrożeniu, nie są zastąpione testami źródłowymi.
