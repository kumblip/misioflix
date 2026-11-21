# MisioFlix Native v0.4.119.0

## Co się zmieniło
- Na komputerach (od 921 CSS px) podpisy gatunków na plakatach powiększone z 10 px do 11,5 px. Dotyczy natywnych kafelków Jellyfina oraz kafelków MisioFlixa na stronie głównej, w bibliotekach, kolekcjach, propozycjach, pełnych listach i wyszukiwarkach. Styl mobilny nietknięty.
- Początkowe ładowanie w karuzelach bibliotek, kolekcji i propozycji: nadal **10** kart. Każde następne doładowanie przy przewijaniu albo kliknięciu strzałki: **maksymalnie 25** kart. Kolejność: 10 → 35 → 60 → 85… aż do końca.
- Rozszerzenie limitu tylko trzech endpointów karuzel (25 zamiast 24): `/home/shelf`, `/home/collections`, `/home/recommendation-cards`, oraz odpowiadających im usług. **Nie zmieniono** liczby 24 pozycji pobieranych w pełnym widoku wszystkich kolekcji (`home.js` nadal żąda `limit=24`); endpoint jedynie dopuszcza 25 dla karuzeli.
- Tryb „Losuj” w zwykłych bibliotekach nadal losuje 5 kart. Tryb „Losuj” w propozycjach nadal przewija całą pulę; nowe pobrania są po 25. Brak zmian we wczytywaniu katalogu wyszukiwarki.

## Gwarancje zakresu
Nie modyfikowano algorytmu losowania, renderowania kafelków, statusów MAL/Simkl, nawigacji, NFO, układu mobilnego, dotykowej fizyki przewijania ani workflow GitHub Actions. Pierwsze 10 kart nadal ładuje się na żądanie i dalsze 25 pojawia się dopiero po przewinięciu.
