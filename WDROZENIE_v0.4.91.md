# Wdrożenie v0.4.91.0

1. Wgraj pełną paczkę `MisioFlix_Native_v0.4.91_GitHub_PELNE.zip` albo pliki różnicowe `MisioFlix_Native_v0.4.91_TYLKO_ZMIANY.zip` do repozytorium `kumblip/misioflix`, zachowując podkatalogi.
2. GitHub Actions: uruchom `dotnet publish src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj --configuration Release --output build/publish` i upewnij się, że kompilacja przechodzi.
3. Opublikuj release i zainstaluj w Jellyfin 12.4. Restart serwera, Ctrl+F5 na kliencie.
4. Otwórz film z BoxSetem (np. Step Up 4 Revolution) z poziomu strony głównej, biblioteki i dalszych kart infinite scroll: wszystkie wyświetlają jeden wspólny kontener, `7 🐾` nad `3 📦`.
5. Sprawdź serial M*A*S*H / Grimm, liczbę sezonów i odcinków oraz ewentualną różową łapkę Simkl: każda łapka jest wyżej niż `N 📦`.
6. Otwórz BoxSet: `N 🎬` pozostaje w jego własnej pojedynczej ramce, w prawym górnym rogu plakatu.
7. Jeśli coś nie działa, porównaj 0.4.91 z pełnym checkpointem 0.4.90.

To źródła, nie DLL. Dokumentacja i CSS Jellyfina są w osobnych plikach TXT; nie zastępują ustawień serwera.
