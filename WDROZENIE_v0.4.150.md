# Wdrożenie 0.4.150.0

1. Baza: działająca wersja 0.4.149.0 KOMPATYBILNOŚĆ CI FIX.
2. Rozpakuj ZIP w katalogu głównym repozytorium, nadpisz pliki zachowując ich ścieżki. Brak plików do ręcznego usuwania.
3. Commit, standardowy build i release z hasłem PUBLIKUJ. Aktualizacja wtyczki, restart Jellyfin, Ctrl+F5.
4. Home → Propozycje → przełącznik bezpośrednio po napisach: Wszystkie → Nieobejrzane → Rozpoczęte → Wszystkie. Sprawdź znany rozpoczęty film/serial oraz ukończony materiał, z pozostałymi filtrami włączonymi i wyłączonymi. Losuj i otwórz pełną listę gatunku.
5. Status odczytywany z Jellyfin, nie z zewnętrznych list MAL/SIMKL. Pierwsze włączenie filtra wymaga odczytu statusów; przy kolejnych przełączeniach w obrębie aktywnej sesji wykorzystywany jest ten sam odczyt. Wróć do Wszystkie i ponownie aktywuj filtr, aby odświeżyć statusy. Nie ma potrzeby czyszczenia cache plakatów ani wysyłania raportów diagnostycznych.
