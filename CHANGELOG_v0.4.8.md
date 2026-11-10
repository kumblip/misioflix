# MisioFlix v0.4.8 — mocniejszy motyw natywnego Jellyfin

## Po informacji zwrotnej od użytkownika
Wersja 0.4.7 rzeczywiście niewiele zmieniała: różowe kafelki bibliotek, oryginalna strona główna prawie bez dodatkowego stylowania i szerokie karuzele. Ta poprawka rozwija istniejący motyw **bez powracania do drugiego interfejsu v0.4.6**.

### Zmiany
- Bardziej kontrastowy, spójny ciemny styl MisioFlix, jeden oryginalny nagłówek Jellyfin.
- Sekcja **Moje multimedia**: ciemne, obrysowane kafelki zamiast jaskraworóżowych przycisków; subtelne podniesienie po najechaniu.
- Sekcja **Kontynuuj odtwarzanie**: kompaktowa, zaokrąglona plansza z gradientem; oryginalne karty i postęp Jellyfin pozostają funkcjonalne.
- Sekcje **ostatnio dodane**: wyraźniejsze nagłówki i bardziej eleganckie odstępy.
- Karty Jellyfin: zaokrąglone obrazy, animacja podświetlenia, dwulinijkowe tytuły, lepsza typografia.
- Cienkie ramki stanów z oryginalnego Jellyfin: różowy (jawnie nieobejrzane), bursztynowy (postęp), zielony (obejrzane). Brak statusu = brak obrysu.
- Lekka anotacja istniejących kontenerów DOM (bez tworzenia elementów, odrębnych tras i dodatkowych zapytań o katalog).
- Obsługa Modern i Legacy za pomocą niezależnych selektorów CSS, gdy są dostępne.

### Czego celowo NIE ma
- Nie podmieniamy obrazów zapytaniami o drugi plakat ani nie tworzymy własnych opisów/kart.
- Nie ma nowej wyszukiwarki NFO, kocich łapek z ocenami, panelu MAL ani „Losuj” — wymagają funkcjonalnego rozszerzenia konkretnych widoków po zweryfikowaniu DOM aktualnej wersji Jellyfin.
- Nie zmieniamy kolejności bibliotek ani ich danych.
- Nie modyfikujemy oryginalnych plików Jellyfin Web ani `index.html` na dysku.

### Testy
Weryfikowane lokalnie: składnia JS, struktura CSS, izolacja nawigacji, brak fetch i tworzenia kart, dekoracja istniejącej sekcji i znane oznaczenia statusu. Zależne od wersji selektory nowoczesnego Jellyfin wymagają kontroli na prawdziwym NAS-ie.
