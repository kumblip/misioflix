# Zbudowanie instalacyjnego ZIP-a bez kompilowania na UGREEN

## Wariant A — GitHub Actions (najprostszy poza NAS-em)

1. Utwórz nowe **prywatne** repozytorium GitHub `misioflix-native`.
2. Prześlij pliki z TEJ paczki do głównego katalogu repozytorium, łącznie z
   `.github/workflows/build.yml` (zachowaj podkatalogi). Nie wrzucaj haseł,
   tokenów, bibliotek multimedialnych ani plików `.env` z NAS-a.
3. Otwórz zakładkę **Actions → MisioFlix — build dla Jellyfin 12.4 → Run workflow**.
4. Po ukończeniu kompilacji pobierz `MisioFlix_0.4.0_JF12.4` z sekcji **Artifacts**.
5. Rozpakuj pobrany artifact. W środku znajdziesz
   `MisioFlix_0.4.0_JF12.4.zip` z katalogiem `MisioFlix_0.4.0/`
   zawierającym `Jellyfin.Plugin.MisioFlix.dll` i `meta.json`.

**Jeżeli Actions zakończy się błędem kompilacji**, NIE kopiuj źródeł na NAS.
Prześlij tekst błędu kompilatora — wymaga poprawienia kodu.

## Wariant B — komputer z SDK .NET 10

```bash
dotnet publish src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj -c Release -o build/publish
python3 tools/package.py
```

W obu wariantach NFO oraz grafiki są już osadzone w projekcie; nie kompiluje się niczego
na NAS-ie.

## Dlaczego teraz nie załączono DLL?

W środowisku tworzenia paczki nie ma `dotnet` ani dostępu do repozytorium NuGet.
Nie oznaczamy samego źródła C# jako gotowej i przetestowanej DLL.
