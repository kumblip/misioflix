# MisioFlix Native v0.4.11 — GitHub

To **kompletna paczka źródłowa**, nie DLL. Wgraj pliki zachowując ścieżki i uruchom `build.yml`. Po pomyślnym buildzie uruchom `release.yml` z `PUBLIKUJ`, zainstaluj 0.4.11.0 z katalogu Jellyfin, zrestartuj kontener i wymuś odświeżenie przeglądarki `Ctrl+Shift+R`.

## Test regresji, który wykrywał błąd użytkownika
1. Otwórz `http://kumadlaneko:8096/web/#/home` po pełnym odświeżeniu. AnimePL ma pionowe plakaty.
2. Kliknij ikonę Jellyfin/MisioFlix w lewym górnym rogu (powrót na `#/`).
3. Sprawdź, czy po załadowaniu obrazów karuzele AnimePL wciąż wyświetlają pionowe plakaty `Primary`.
4. Przejdź do biblioteki, wróć przyciskiem Wstecz i ponownie kliknij logo. Sprawdź, czy nie ma pustych kart i błędów 404.
5. Sprawdź, czy filmy i odcinki zachowały właściwe obrazy oraz działają szczegóły i odtwarzanie.

## Uwagi
- Ta poprawka nie tworzy nowej strony ani nie skanuje od nowa całej biblioteki.
- Karta bez obrazu `Primary` nadal pokazuje oryginalny obraz Jellyfin, bez sztucznego rozciągania.
- Sprawdzono statyczne testy oraz reprodukcję wyścigu ładowania obrazu w teście przeglądarkowym; rzeczywisty NAS wymaga testu.
