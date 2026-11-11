# MisioFlix Native v0.4.17.0

## Wyszukiwarki
- Biblioteki oraz typy multimediów są klikalnymi filtrami z cyklem **neutralny → zielony (uwzględnij) → czerwony (wyklucz) → neutralny**.
- Kilka zaznaczonych pozytywnie bibliotek lub typów działa jako alternatywy (OR); negatywne są wykluczane. Gatunki pozostają warunkami łączonymi przez AND.
- Gatunki są rozwinięte od razu. Wyszukiwarka anime zachowuje słownik dokładnie 52 gatunków z NFO, a wyszukiwarka nie-anime stosuje wyłącznie gatunki zapisane w odpowiednich filmach i serialach przez Jellyfin.
- Podpowiedzi tytułów zawierają miniaturę plakatu (jeżeli istnieje), rok, liczbę sezonów oraz odcinków. Tytuły sezonów/Speciali nadal wyszukują nadrzędną serię po rzeczywistym `SeriesId`.

## Stan oglądania
- Cienkie ramki na plakatach są rysowane w warstwie na obrazie: **jasnoróżowa / bursztynowa / zielona** dla nieobejrzanych / rozpoczętych / obejrzanych.
- `Oglądaj dalej`: zapytanie `UserItems/Resume` zawiera `Recursive=true` dla zagnieżdżonych odcinków. Jeśli Jellyfin nie zwróci resumowanych pozycji, wtyczka podejmie jedną ograniczoną próbę odczytu z `Items?Filters=IsResumable`. Przy brakującym `SeriesId` w DTO może skorzystać z metadanych tego samego odcinka przechowywanych w lokalnej bazie Jellyfin.
- Reguły ukrywania wznowień pozostają przypisane do użytkownika, bez modyfikacji historii Jellyfin.

## Bezpieczeństwo odtwarzacza
- Podczas wyświetlania odtwarzacza video wtyczka automatycznie wyłącza własną klasę motywu `misioflix-skin`, pozostawiając oryginalne style i odtwarzacz Jellyfin. To ochrona przed konfliktami CSS, **nie** poprawka dekodowania HEVC/Dolby Vision ani transkodowania.

## Weryfikacja
- 39/39 testów Python przeszło lokalnie, kontrola JavaScript przez Node oraz testy DOM.
- Sprawdzono w lokalnym Chromium obsługę filtrów, sugestii i oddzielnych gatunków filmu/serialu.
- **Nie przeprowadzono kompilacji DLL ani testu na prawdziwym Jellyfin/NAS.** Poprawa wznowień i odtwarzania wymaga potwierdzenia po instalacji.
