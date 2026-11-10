# MisioFlix 0.4.7.0 — natywny motyw oryginalnego Jellyfin Web

## CEL
Po v0.4.6 występowały: podwójne menu, ponowne ładowanie katalogu, błąd 404 po kliknięciu kart oraz niespójne losowanie. Ta poprawka **nie buduje osobnego interfejsu**: Jellyfin renderuje własne karty i ekrany, a MisioFlix nakłada motyw CSS i niewielki skrypt obserwujący wyłącznie natywne oznaczenia obejrzenia/postępu.

## Zmiana architektury (celowo radykalna)
- Skrypt **nie** wywołuje `/MisioFlix/api/catalog`, `/Items`, żadnej dodatkowej wyszukiwarki, ani nie pobiera zdjęć.
- Skrypt **nie** tworzy pływającego portalu, podwójnego nagłówka, odrębnych kart, hero, menu, routingu, przycisku „Losuj”.
- Natywna nawigacja Jellyfin otwiera szczegóły, sezony, odcinki, wyszukiwarkę i odtwarzacz.
- CSS ustawia misioflixowe barwy, tło, paski, styl natywnych kart i subtelne ramki. Gdy Jellyfin **nie ujawnia statusu w DOM**, ramka pozostaje neutralna — brak fałszywych danych.
- Backend katalogu, NFO oraz MAL w C# pozostaje w repozytorium, ale **nie jest wywoływany z tej wersji klienta**. Integracja MAL i własne panele ocen wymagają osobnej, niewchodzącej w drogę Jellyfin, integracji w kolejnym etapie.

## Instalacja
1. **Zachowaj działającą instalację v0.4.6 jako punkt przywracania.**
2. Wgraj pliki ZIP do głównego katalogu repozytorium `kumblip/misioflix`, zachowując ścieżki. Zastąp istniejące pliki. Wszystkie pliki w ZIP to źródła/konfiguracja, nie skompilowana DLL.
3. GitHub Actions > Build — musi przejść `node --check`, testy i `dotnet publish` (.NET 10).
4. W GitHub Actions > Publish uruchom ręcznie workflow (`PUBLIKUJ`) dopiero po zielonej kompilacji.
5. W Jellyfin > Wtyczki > Katalog zainstaluj `0.4.7.0` i zrestartuj sam kontener Jellyfin.
6. W przeglądarce wykonaj **Ctrl+Shift+R**. Stary `client.js` nie może być nadal w pamięci przeglądarki.
7. Upewnij się, że nie pozostało **ręczne** wstrzyknięcie starego skryptu MisioFlix w osobnej wtyczce JavaScript Injector; inne wtyczki zostają nietknięte.

## Test akceptacyjny
- Po zalogowaniu: **jeden** pasek menu (oryginalny Jellyfin) i normalnie działający ekran główny.
- Nie pojawia się dodatkowe „Ładowanie katalogu Jellyfin i NFO…”.
- Kliknięcie plakatu otwiera natywne szczegóły Jellyfin — nie ma błędu 404 z prywatnego routingu MisioFlix.
- Otwieranie sezonu/odcinka i odtwarzanie działa jak przed instalacją.
- Biblioteki, wyszukiwanie i sortowanie działa natywnie; nie ma przycisku `Losuj` z poprzedniego nakładanego interfejsu.
- Kolory statusów: różowy dla jawnie nieobejrzanych, bursztynowy dla jawnie rozpoczętych, zielony dla oznaczonych jako obejrzane; nieznane statusy bez koloru, żeby nie zgadywać.
- Sprawdź komputer i telefon oraz ekran Modern/Legacy, bo klasy DOM w Jellyfin 12 mogą się różnić.

## Uczciwe ograniczenia
Ta poprawka jest **przede wszystkim przywróceniem oryginalnego przepływu Jellyfin** i pierwszą wersją motywu. Nie deklaruje gotowości własnej wyszukiwarki NFO, przycisków ocen i MAL, łapek ani losowania z pełnej biblioteki. Te funkcje wymagają ostrożnych, punktowych rozszerzeń oryginalnego ekranu, najlepiej po obejrzeniu HTML elementów na Twojej instalacji Jellyfin 12.4. Nie należy ich implementować jako drugą stronę ani przez przeszukiwanie całej biblioteki po wejściu na Home.

## Powrót
W przypadku problemu przywróć poprzednią wersję wtyczki lub wyłącz MisioFlix w Panelu Jellyfin i zrestartuj kontener. Dane biblioteki i metadane nie są dotykane. Nie usuwaj NFO.
