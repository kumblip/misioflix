# MisioFlix Native v0.4.50.0 — Simkl BETA: automatyczne obejrzenia i lokalne archiwum

**Baza kodowa:** v0.4.49.0 (z poprawką kompilacji C# CS0136). **Zatwierdzony punkt przywracania:** v0.4.45.0 (nie nadpisywać, nie usuwać). Wersja 0.4.50 pozostaje BETA.

## 1. Pojedynczy odcinek

Panel **Moje Simkl** na stronie odcinka pokazuje tylko pole **Status** z opcjami **Nie obejrzany** (domyślnie) i **Obejrzany** (gdy Simkl lub lokalny backup potwierdza). Zmiana w polu zapisuje ten konkretny odcinek w Simkl, bez osobnych przycisków, oceny serialu ani licznika ponownych obejrzeń. Własny CSS Simkl zapewnia wygodną obsługę na telefonie i komputerze.

## 2. Automatyczne oznaczanie oglądania

Zdarzenia serwerowe `ISessionManager.PlaybackStart`, `PlaybackProgress`, `PlaybackStopped` działają niezależnie od używanego klienta (web, Android, aplikacje Jellyfin), **jeżeli dany klient zgłasza Jellyfinowi postęp odtwarzania**. Oglądanie filmu lub odcinka przez co najmniej 75% czasu materiału powoduje jednorazowe oznaczenie jako obejrzany w Simkl. Przejście do następnego odcinka **tego samego serialu** w ciągu 10 minut po poprzednim potwierdza poprzedni odcinek również bez osiągnięcia 75%, ale tylko po co najmniej minucie odtwarzania i osiągnięciu przynajmniej 5% pozycji (zabezpieczenie przed przypadkowym kliknięciem i pomijaniem).

Automatyczny zapis obejrzenia **jest celowym wyjątkiem** od reguły ręcznych zmian w Simkl. Statusy całego serialu, oceny, dodawanie do listy i ręczna edycja sezonów nadal wymagają zatwierdzenia przez użytkownika. Nie ma automatycznego przeliczania liczników *ponownych obejrzeń*.

Dodatkowo serwer:
- odrzuca anime z biblioteki AnimePL i multimedia bez zweryfikowanego identyfikatora TMDB/IMDb/TVDB;
- nie wymaga instalowania kolejnej wtyczki Simkl;
- rozróżnia użytkowników Jellyfina i sesje/urządzenia;
- zabezpiecza się przed powtarzającymi zgłoszeniami postępu oraz spóźnionym `PlaybackStopped` wcześniejszego odcinka;
- zapisuje żądanie do trwałej lokalnej kolejki **przed** próbą wysłania do Simkl i ponawia je później po błędach sieci.

## 3. Lokalny rewatch, backup i eksport

Każdy użytkownik ma osobny plik JSON na NAS-ie w katalogu danych wtyczki:

`<Jellyfin DataPath>/misioflix/simkl/local-backup/<Jellyfin User GUID>.json`

Pliki tokenów Simkl są przechowywane oddzielnie i **nie** są umieszczane w eksporcie. Archiwum obejmuje statusy, oceny, historię odcinków otrzymaną z Simkl, lokalne liczniki ponownych obejrzeń oraz nieprzesłane jeszcze automatyczne obejrzenia. W systemach Unix zapis jest atomowy z uprawnieniami użytkownika; rozłączenie konta Simkl nie usuwa archiwum.

**Ponowne obejrzenia** są lokalne i edytowalne w „Edytuj” oddzielnie dla całego serialu, każdego sezonu i filmu. Brak tego pola na stronie pojedynczego odcinka.

Odświeżanie danych Simkl: po zmianie ręcznej w interfejsie oraz po upływie 72 godzin od ostatniego udanego sprawdzenia — przy najbliższej aktywności zalogowanego użytkownika MisioFlixa. Ręcznego przycisku odświeżania nie ma. W trybie chwilowej niedostępności Simkl wyświetlany jest ostatni zapisany stan; zaległe automatyczne obejrzenia pozostają w kolejce. W menu Simkl na stronie głównej znajduje się **Eksportuj lokalną kopię Simkl (JSON)**. Ręczna edycja zdalnych statusów/ocen nadal wymaga działającego połączenia — tryb offline umożliwia przeglądanie i eksport, a nie pełną lokalną edycję całej listy.

## 4. Bezpieczeństwo zmian

Integracja MAL, ramki plakatów, skaner, odtwarzacz Jellyfin i konfiguracja GitHub Actions pozostają nietknięte. Dla nowej integracji zachowano osobne `simkl.js`, `simkl.css`, własne endpointy API i usługi po stronie serwera.

## 5. Weryfikacja

258 testów Pythona i 9 skryptów Node.js — zaliczone. W tej przestrzeni roboczej nie ma kompilatora .NET 10 i nie było możliwe rzeczywiste uruchomienie w Jellyfinie ani test zapisu na koncie Simkl. Wymagana kompilacja `dotnet publish` przez GitHub Actions i test na NAS-ie. Nie przedstawiać źródeł jako gotowej DLL.
