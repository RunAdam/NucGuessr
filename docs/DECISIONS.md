# NucGuessr — Journal des décisions

Ce fichier garde la trace des choix tranchés au fil des phases de la [feuille de route](../ROADMAP.md) : la question posée, les options envisagées, le test qui a servi à décider, le choix retenu et sa raison. Le critère de décision est toujours l'expérience du joueur (lisibilité, prise en main, équité, tension agréable, pas de frustration, mobile) ; à qualité égale, on garde le plus simple.

Les valeurs retenues sont réglables dans [`src/config.ts`](../src/config.ts), le fichier de configuration unique du jeu. Elles pourront être ajustées en phase 8 à partir des retours de la promo.

---

## Phase 0 — Cadrage des règles

**Simulations :** `node scripts/sim/tout.mjs` (Node 24, aucune dépendance, ≈ 30 s), ou chaque script séparément :

| Script | Question |
|---|---|
| `node scripts/sim/anti-repetition.mjs` | 0.1 Anti-répétition des photos |
| `node scripts/sim/bareme-rapidite.mjs` | 0.2 Barème Rapidité |
| `node scripts/sim/durees.mjs` | 0.3 Délai entre rounds, 0.4 Limite de temps Distance |
| `node scripts/sim/bareme-distance.mjs` | 0.5 Valeur de k, 0.6 Bonus de précision |

Les simulations sont reproductibles (graine fixe). Les temps de réflexion des joueurs sont des hypothèses raisonnables, pas des mesures : elles servent à comparer les options entre elles, pas à prédire les scores exacts. Les coordonnées des centrales sont approchées à la commune ; elles seront remplacées par celles de `data/sites.json` (phase 1), ce qui ne change pas les ordres de grandeur.

### 0.1 Anti-répétition des photos d'une partie à l'autre

**Question :** comment éviter de revoir les mêmes photos d'une partie à l'autre, sans bloquer le tirage ni défavoriser certains sites ?

**Options testées** (contrainte commune : jamais deux fois le même site dans une partie) :
- **0** — aucune mémoire (référence) ;
- **A** — exclure les N dernières photos vues (N = 8, 16, 24, 40), avec repli si l'exclusion empêche de trouver assez de sites ;
- **B** — tirage pondéré, poids d'une photo = 1 − exp(−âge/τ), âge en parties (τ = 1 ou 3) ;
- **C** — rotation par site : sites tirés uniformément, puis, pour chaque site, la photo vue il y a le plus longtemps.

**Test :** 2 000 séries de 30 parties consécutives par option, avec plusieurs banques (54 photos à 3 par site, 72 photos inégales de 3 à 5 par site, 90 photos à 5 par site, et un cas extrême de 1 à 6 photos par site), en Rapidité (8 rounds) et en Distance (5 rounds).

| Rapidité, 72 photos (3 à 5 par site) | Déjà vue à la partie précédente | Déjà vue dans les 3 précédentes | Site le plus fréquent / le moins fréquent |
|---|---|---|---|
| 0 aucune mémoire | 11,6 % | 30,8 % | ×1,02 |
| A N = 24 | 0 % | 0 % | ×1,07 |
| A N = 40 | 0 % | 0 % | ×1,28 |
| B τ = 3 | 4,2 % | 19,3 % | ×1,51 |
| **C rotation par site** | **0 %** | **2,9 %** | **×1,02** |

**Résultat :** aucune option ne bloque (zéro blocage sur toutes les banques). C supprime toute répétition d'une partie à l'autre (54 photos : 0 % à la partie précédente, 8,8 % sur les 3 précédentes en Rapidité, contre 38 % sans mémoire ; 90 photos : 0 %) tout en gardant les 18 sites également représentés. A avec N = 24 fait aussi bien sur les photos, mais fait sortir moins souvent les sites qui ont peu de photos (jusqu'à ×2,6 d'écart dans le cas extrême) et demande un N à régler et un repli. B est moins efficace et favorise les sites riches en photos (×1,5 à ×5).

**Choix retenu : C, rotation par site.** On tire 8 (ou 5) sites distincts au hasard, puis pour chaque site la photo vue il y a le plus longtemps (jamais vue en priorité, égalités au hasard). L'historique local retient le numéro de la dernière partie où chaque photo a été vue, tous modes confondus.

**Raison :** c'est l'option la plus juste pour le joueur (chaque centrale revient aussi souvent, quel que soit le nombre de photos dont on dispose), elle épuise toutes les photos d'un site avant d'en remontrer une, elle ne peut pas bloquer et elle n'a aucun paramètre à régler. La seule répétition restante est inévitable : un site qui n'a qu'une photo la remontre à chaque fois qu'il sort.

### 0.2 Barème du mode Rapidité

**Question :** quelle formule de score, quel plancher pour une bonne réponse tardive, et faut-il pénaliser les erreurs au-delà des −2 s déjà décidées ?

**Options testées** (t = temps restant à la bonne réponse, pénalités déjà retirées) :
- **A** — `max(100, 1000 × t/20)` (piste de l'annexe) ;
- **B1** — `100 + 900 × t/20` (plancher intégré à une formule affine) ;
- **B2** — `200 + 800 × t/20` (plancher plus haut) ;
- **C** — B1 avec en plus −100 points par erreur (double peine).

**Test :** table des scores (temps écoulé 2 à 19,5 s × 0 à 3 erreurs), espérance de la stratégie « essayer plein de noms » (saisie d'un nom ≈ 1,2 s avec l'autocomplétion), et 5 000 parties de 8 rounds pour trois profils de joueurs.

Table pour la formule retenue (B1), en points :

| Temps écoulé | 0 erreur | 1 erreur | 2 erreurs | 3 erreurs |
|---|---|---|---|---|
| 2 s | 910 | 820 | 730 | 640 |
| 4 s | 820 | 730 | 640 | 550 |
| 6 s | 730 | 640 | 550 | 460 |
| 8 s | 640 | 550 | 460 | 370 |
| 10 s | 550 | 460 | 370 | 280 |
| 12 s | 460 | 370 | 280 | 190 |
| 14 s | 370 | 280 | 190 | 0 (perdu) |
| 16 s | 280 | 190 | 0 | 0 |
| 18 s | 190 | 0 | 0 | 0 |
| 19,5 s | 123 | 0 | 0 | 0 |

| Option | Espérance « mitrailler les 18 noms » | … équivaut à une bonne réponse trouvée à | Hésiter entre 2 noms | Expert / moyen / débutant (médiane sur 8 rounds) |
|---|---|---|---|---|
| A | 131 | 17,3 s | 710 | 5 961 / 4 005 / 1 512 |
| **B1** | **145** | **18,9 s** | **739** | **6 165 / 4 362 / 1 748** |
| B2 | 160 | 19,9 s | 768 | 6 369 / 4 735 / 2 017 |
| C | 106 | 19,8 s | 689 | 6 046 / 4 000 / 1 530 |

**Résultat :** avec toutes les options, mitrailler les noms au hasard rapporte en moyenne moins qu'une bonne réponse trouvée en réfléchissant jusqu'à 17-19 s : la pénalité de −2 s suffit à rendre cette stratégie non rentable. Les scores s'étalent bien et les trois profils sont nettement séparés. A a une zone morte (toute réponse après 18 s vaut 100) ; C n'apporte rien contre le mitraillage mais punit deux fois l'hésitation honnête entre deux ou trois noms ; B2 tasse les écarts.

**Choix retenu : B1, `score = 100 + 900 × temps_restant / 20`**, arrondi à l'entier ; 0 si le temps est écoulé. Pas de malus supplémentaire par erreur.

**Raison :** une seule formule continue, facile à expliquer (« 100 points pour la bonne réponse, plus 45 points par seconde restante ; une erreur coûte 2 s, soit 90 points »). Une bonne réponse à la dernière seconde vaut toujours au moins 100 points, ce qui récompense celui qui trouve, sans rendre le mitraillage intéressant.

### 0.3 Délai entre deux rounds (Rapidité)

**Question :** afficher la réponse un moment entre deux rounds, ou enchaîner directement ?

**Options testées :** enchaîner (0 s) ; 1,5 s fixe ; 1,5 s après une bonne réponse et 3 s après un round perdu ; attendre un appui du joueur.

**Test :** durée d'une partie de 8 rounds pour trois profils (20 000 parties chacun).

| Délai | Expert | Moyen | Débutant (32 % de rounds perdus) |
|---|---|---|---|
| Enchaîner | 0 min 40 s | 1 min 21 s | 2 min 01 s |
| **1,5 s / 3 s si perdu** | **0 min 52 s** | **1 min 34 s** | **2 min 16 s** |
| Attendre un appui | 0 min 50 s | 1 min 31 s | 2 min 11 s |

**Résultat :** le délai ajoute 12 à 15 s à une partie qui dure de 1 à 2,5 min ; il ne met pas en danger la cible de 2 à 5 min. Sans délai, le joueur ne voit jamais la bonne réponse d'un round perdu et n'apprend rien ; attendre un appui casse le rythme d'un mode censé être nerveux.

**Choix retenu :** la réponse s'affiche **1,5 s après une bonne réponse** et **3 s après un round perdu**, puis le round suivant démarre seul. `Entrée` (ou un tap) passe l'affichage, mais seulement après 400 ms d'anti-rebond.

**Raison :** 1,5 s suffit pour lire « Centrale nucléaire de … » quand on vient de le taper ; une réponse inconnue demande plutôt 3 s pour être lue et reliée à la photo. L'anti-rebond évite que l'`Entrée` qui valide la réponse saute aussi l'affichage.

### 0.4 Limite de temps du mode Distance

**Question :** faut-il une limite de temps par round en mode Distance (aucune, 2 ou 3 min) pour éviter les parties qui traînent ?

**Options testées :** aucune limite, 3 min, 2 min, 1 min.

**Test :** durée d'une partie de 5 rounds pour trois profils (temps médian par round : 20 s, 35 s, 60 s pour un joueur lent ou sur mobile), écran de résultat compris.

| Limite | Rounds coupés (lent / mobile) | Durée médiane (rapide / moyen / lent) |
|---|---|---|
| **Aucune** | **0 %** | **2 min 21 s / 3 min 44 s / 6 min 01 s** |
| 3 min | 1,3 % | 2 min 21 s / 3 min 44 s / 6 min 01 s |
| 2 min | 8,3 % | 2 min 21 s / 3 min 44 s / 5 min 54 s |
| 1 min | 49,7 % | 2 min 21 s / 3 min 35 s / 4 min 48 s |

**Résultat :** une limite de 2 ou 3 min ne raccourcit presque pas les parties (−7 s au mieux) ; elle ne touche que les joueurs lents, surtout sur mobile (bascule photo/carte, zoom au doigt), et 8 % de leurs rounds seraient coupés à 2 min. Seule une limite d'1 min raccourcit vraiment les parties, au prix d'un round sur deux coupé pour ces joueurs.

**Choix retenu : aucune limite de temps** (`DISTANCE_LIMITE_MS = null`).

**Raison :** le mode Distance est le pendant réfléchi du mode Rapidité. Une partie qui traîne ne gêne que celui qui la joue (pas de classement partagé en v1), alors qu'un chronomètre ajoute du stress et de l'interface pour un gain nul. À reconsidérer si les parties partagées ou un classement arrivent (phase 9).

### 0.5 Barème du mode Distance : valeur de k

**Question :** dans `score = 5000 × exp(−d/k)`, quel k pour qu'une erreur « bon fleuve, mauvais site » coûte cher sans être nulle ?

**Options testées :** k = 50, 75, 100, 125, 150 km.

**Test :** score pour des erreurs types et pour les confusions entre centrales voisines d'un même fleuve ou d'une même côte, sur les distances réelles (approchées) ; score moyen d'un clic au hasard et d'un joueur qui clique toujours au centre de la France.

| Cas | d | k = 50 | **k = 75** | k = 100 | k = 150 |
|---|---|---|---|---|---|
| Clic imprécis | 10 km | 4 094 | **4 376** | 4 524 | 4 678 |
| Cruas ↔ Tricastin (Rhône) | 34 km | 2 546 | **3 188** | 3 568 | 3 993 |
| Paluel ↔ Penly (Manche) | 43 km | 2 103 | **2 807** | 3 242 | 3 746 |
| Dampierre ↔ Saint-Laurent (Loire) | 70 km | 1 227 | **1 960** | 2 477 | 3 130 |
| Saint-Alban ↔ Cruas (Rhône) | 86 km | 900 | **1 594** | 2 122 | 2 823 |
| Saint-Laurent ↔ Chinon (Loire) | 119 km | 463 | **1 023** | 1 521 | 2 261 |
| Chooz ↔ Cattenom (Meuse/Moselle) | 127 km | 394 | **918** | 1 403 | 2 143 |
| Golfech ↔ Blayais (Garonne/Gironde) | 176 km | 147 | **476** | 857 | 1 543 |
| Mauvaise région | 300 km | 12 | **92** | 249 | 677 |
| Toujours cliquer au centre (moyenne) | ≈ 300 km | 143 | **341** | 571 | 1 039 |

**Résultat :** la distance d'une centrale à sa plus proche voisine va de 34 à 185 km (médiane 82 km). Avec k = 75, confondre deux voisines d'un même fleuve coûte entre un tiers et deux tiers des points, une confusion plus lointaine sur le même fleuve en garde 10 à 20 %, et cliquer au centre sans regarder la photo ne rapporte que 7 % des points. k = 50 rend nulles les confusions à plus de 100 km ; k ≥ 100 fait trop peu payer la confusion (Cruas ↔ Tricastin garde 71 %) et récompense trop le clic au centre (11 % à 21 %).

**Choix retenu : k = 75 km.**

**Raison :** c'est la valeur qui sépare le mieux les trois niveaux d'erreur (bon site / bon fleuve mais mauvais site / mauvaise région), sans rendre nul le joueur qui a au moins trouvé le bon fleuve. Avec le rayon de tolérance de 0.6, la formule finale est un peu plus clémente (Cruas ↔ Tricastin : 3 408, Saint-Laurent ↔ Chinon : 1 093).

### 0.6 Bonus de précision du mode Distance

**Question :** faut-il récompenser une précision parfaite (< 5 km) ?

**Options testées :** (a) aucun bonus ; (b) +500 points si d < 5 km ; (c) rayon de tolérance R (2, 3 ou 5 km) : 5000 points si d ≤ R, puis `5000 × exp(−(d − R)/k)`, sans discontinuité.

**Test :** joueur qui a reconnu le site, avec une erreur de clic aléatoire d'écart-type σ = 1 km (ordinateur, zoomé), 2 km (mobile, zoomé) ou 5 km (peu zoomé) ; probabilité d'obtenir 5000 sur un round et 25 000 sur une partie.

| Option | P(partie à 25 000), ordinateur | P(partie à 25 000), mobile |
|---|---|---|
| (a) aucun | 0 % | 0 % |
| (b) +500 si < 5 km | 100 % (mais 27 500 possibles) | 80 % |
| (c) R = 3 km | 95 % | 14 % |
| **(c) R = 5 km** | **100 %** | **81 %** |

**Résultat :** sans rien, le maximum de 25 000 est inatteignable : un clic pile sur la centrale affiche 4 9xx, ce qui frustre. Le bonus (b) crée une marche de 500 points à 5 km (un clic à 4,9 km vaut 513 points de plus qu'à 5,1 km) et casse le maximum annoncé. R = 3 km désavantage nettement le mobile.

**Choix retenu : pas de bonus, mais un rayon de tolérance de 5 km** : tout clic à moins de 5 km vaut 5000 points (« dans le mille »), puis le score décroît de façon continue : `score = 5000 × exp(−max(0, d − 5) / 75)`.

**Raison :** le maximum de 25 000 devient atteignable par un joueur qui connaît vraiment les sites, sur ordinateur comme sur mobile, sans exiger un zoom extrême au doigt. La formule reste continue (aucun effet de seuil). 5 km est sans ambiguïté : deux centrales ne sont jamais à moins de 34 km l'une de l'autre.

---

## Phase 1 — Données des sites

**Validation des données :** `npm run validate:data` (Vitest + Ajv, ≈ 1 s). Le test `tests/data/sites.test.ts` vérifie `data/sites.json` contre le schéma `data/schema/sites.schema.json` (JSON Schema 2020-12, strict), puis les règles que le schéma ne peut pas exprimer : exactement les 18 identifiants attendus, aucun nom ni alias (normalisé comme l'autocomplétion : minuscules, sans accents, tirets et apostrophes changés en espaces) partagé entre deux sites, nombre de réacteurs cohérent (57 au total), `mise_en_service` égale au premier couplage, aucune paire de sites à moins de 20 km. Il valide aussi `data/photos.json` (phase 2) quand il existe.

**État des données :** les 18 sites sont saisis, mais **de mémoire** : chaque site porte un champ `verification` qui liste les champs encore à contrôler (voir plus bas). Au départ, les 18 sites sont `A_VERIFIER` (80 champs au total : `lat`/`lon` et puissances pour les 18, années de couplage pour 10, commune pour 4, anecdote pour 2).

### 1.1 Convention de date de mise en service

**Question :** quelle date retenir pour « mise en service » (divergence, couplage au réseau ou mise en service commerciale), et comment la représenter pour un site à plusieurs réacteurs ?

**Options testées :**
- **Événement :** divergence (première réaction en chaîne entretenue) ; **couplage au réseau** (premier raccordement, « grid connection » dans la base PRIS de l'AIEA) ; mise en service commerciale (déclarée par l'exploitant) ;
- **Granularité :** (a) une seule année par site (premier réacteur) ; (b) **une année par réacteur**, affichée en plage ; (c) une date complète (jour/mois/année) par réacteur.

**Test :** rendu de la ligne « réacteurs » de la fiche de fin de partie pour Gravelines (6 réacteurs étalés sur 5 ans), Flamanville (2 P4 + l'EPR) et Civaux, puis longueur sur les 18 sites (un écran de mobile affiche ≈ 40 caractères par ligne).

| Site | (a) année du site | (b) année par réacteur, en plage | (c) date complète par réacteur |
|---|---|---|---|
| Gravelines | 6 × 900 MWe (CP1) · en service depuis 1980 | 6 × 900 MWe (CP1), 1980–1985 | 165 caractères |
| Flamanville | … · en service depuis 1985 | 2 × 1 300 MWe (P4), 1985–1986 + 1 × 1 600 MWe (EPR), 2024 | 84 caractères |
| Civaux | 2 × 1 450 MWe (N4) · en service depuis 1997 | 2 × 1 450 MWe (N4), 1997–1999 | 45 caractères |
| 18 sites : plus de 2 lignes sur mobile | 0 | 0 (57 caractères au plus) | 10 sites |

*(Puissances affichées à la valeur nominale du palier ; le format exact de la fiche sera fixé en phase 5.)*

**Résultat :** (a) efface l'information la plus parlante de Flamanville (l'EPR de 2024) ; (c) déborde sur 10 sites et réclame des jours et des mois que personne ne retient. (b) reste sur une ou deux lignes et montre les étalements (Gravelines 1980–1985, Flamanville 1985–1986 puis 2024). Côté vérification, le couplage est un événement unique et daté dans toutes les sources publiques (PRIS, tableaux Wikipédia, communiqués EDF) ; la mise en service commerciale est une notion contractuelle propre à l'exploitant, moins bien documentée et floue pour Flamanville 3 ; la divergence est rarement donnée dans les tableaux publics.

**Choix retenu : année du couplage au réseau, par réacteur** (`reacteurs.tranches[].couplage`, entier). `mise_en_service` du site vaut l'année du premier couplage d'un réacteur encore en exploitation (redondant, mais pratique pour trier ou pour un futur mode « date » ; le test vérifie l'égalité). Les réacteurs arrêtés (Bugey 1, Chinon A, Chooz A, Saint-Laurent A) ne sont pas listés : ils apparaissent dans les anecdotes.

**Raison :** c'est la date la plus vérifiable (une seule définition, la même partout) et la plus parlante pour un ingénieur (« le réacteur produit pour le réseau »). Stocker l'année par réacteur permet d'afficher une plage courte qui tient sur mobile sans perdre l'EPR de Flamanville. L'année suffit au joueur ; le jour et le mois ajouteraient surtout du risque d'erreur.

### 1.2 Format des données : JSON ou YAML

**Question :** écrire les données des sites en JSON ou en YAML ?

**Options testées :** **JSON** (importé tel quel) ; YAML lu dans le navigateur (bibliothèque `js-yaml`) ; YAML converti en JSON au build (plugin ou script).

**Test :** conversion de `data/sites.json` en YAML avec `js-yaml`, mesure des poids, coût de la bibliothèque dans un bundle minifié (esbuild), et saisie « à la main » de valeurs typiques par un camarade qui oublierait les guillemets.

| | JSON | YAML |
|---|---|---|
| Fichier (18 sites) | 33,7 Ko, 4,6 Ko gzip, 1 104 lignes | 27,7 Ko, 4,4 Ko gzip, 943 lignes |
| Lecture dans le jeu | native (`import` Vite, `JSON.parse`) | + `js-yaml` : 43 Ko minifié, **14 Ko gzip** (7 % du budget de 200 Ko de la phase 8), ou un plugin de build en plus |
| Validation (Ajv) | directe | après conversion |
| `code: 01` (département de l'Ain) | `"01"` (texte, guillemets obligatoires) | **`1`** (nombre) : erreur silencieuse |

**Résultat :** le YAML ne gagne que 0,2 Ko compressé et 15 % de lignes, mais ajoute 14 Ko de bibliothèque (ou une étape de build) et un piège réel : un code de département non mis entre guillemets (`01`, `07`, `08`) devient un nombre. Le JSON est un peu plus verbeux à relire, mais le schéma signale immédiatement toute faute de syntaxe ou de type.

**Choix retenu : JSON** (`data/sites.json`), validé par un JSON Schema (`data/schema/sites.schema.json`).

**Raison :** zéro dépendance et zéro conversion : le fichier relu par les camarades est exactement celui que charge le jeu. Le confort de lecture du YAML ne compense pas ses pièges de typage pour des relecteurs occasionnels ; à qualité égale, on garde le plus simple.

### Structure du champ `verification`

Chaque site porte :

```json
"verification": {
  "statut": "A_VERIFIER",
  "champs": ["lat", "lon", "reacteurs.tranches.puissance_mwe"],
  "notes": "Ce qui reste douteux et comment le vérifier.",
  "sources": []
}
```

- `champs` liste les champs à contrôler, avec des chemins pris dans une énumération du schéma (`lat`, `lon`, `commune`, `reacteurs.tranches.couplage`, `anecdote`…), ce qui évite les fautes de frappe et permet de compter ce qui reste ;
- `statut` vaut `VERIFIE` seulement si `champs` est vide **et** `sources` contient au moins une référence (règle imposée par le schéma) ;
- `sources` reçoit les références consultées pendant la relecture (base PRIS de l'AIEA, fiches ASNR et EDF, orthophotos IGN pour les coordonnées).

Les coordonnées doivent viser le **centre de l'îlot nucléaire** (bâtiments réacteurs) et être relevées sur les orthophotos IGN : celles saisies de mémoire peuvent être fausses de plus d'un kilomètre, ce qui fausserait le rayon « dans le mille » de 5 km du mode Distance.

---

## Phase 2 — Photos

**Outillage :** `scripts/process_photos.py` (traitement des vraies photos), `scripts/generate_placeholders.py` (images de test), tests : `python -m unittest discover scripts/tests` (Python 3 + Pillow, ≈ 30 s). Procédure pour ajouter des photos : [`docs/SOURCING_PHOTOS.md`](SOURCING_PHOTOS.md).

Les deux tests ci-dessous sont des simulations rapides (graine fixe). Les profils de joueurs (expert, moyen, débutant) sont ceux de la phase 0 ; les probabilités de perdre un round selon la difficulté de la photo sont des hypothèses, pas des mesures : elles servent à comparer les options entre elles.

### 2.1 Difficulté par photo

**Question :** faut-il une difficulté par photo, et si oui, à quoi sert-elle ? Elle pourrait réserver les photos faciles au mode Rapidité, où l'on n'a que 20 s.

**Options testées** (difficulté saisie à la main, 1 facile / 2 moyenne / 3 difficile) :
- **A** — difficulté notée mais ignorée par le tirage ;
- **B** — Rapidité : photos faciles (1) seulement ;
- **C** — Rapidité : toutes sauf les difficiles (1 et 2) ; Distance : toutes.

Dans tous les cas, le tirage reste la rotation par site de la phase 0, appliquée aux photos que le mode accepte (repli sur toutes les photos du site si aucune ne passe le filtre).

**Test :** 1 000 séries de 30 parties d'un joueur qui joue 70 % en Rapidité et 30 % en Distance (historique commun aux deux modes). Banque réaliste de 72 photos (3 à 5 par site : une ou deux vues d'ensemble faciles, une aérienne moyenne, un détail difficile), et banque minimale de 54 photos (3 par site). Hypothèse de rounds perdus en Rapidité pour un joueur moyen : 15 % sur une photo facile, 30 % moyenne, 60 % difficile.

| 72 photos (32 faciles, 22 moyennes, 18 difficiles) | Rapidité : photo déjà vue à la partie précédente | … dans les 3 précédentes | Rapidité : rounds perdus | Distance : part de photos difficiles |
|---|---|---|---|---|
| A ignorée | 0 % | 1,4 % | 31 % | 26 % |
| B faciles seulement | 6,9 % | 34 % | 15 % | 41 % |
| **C sans les difficiles** | **0 %** | **7,9 %** | **21 %** | **56 %** |

Avec 54 photos (3 par site) : A 0 % / 6 %, B 32 % / 68 %, C 0 % / 26 %. Avec une seule photo facile par site, B donne 32 % / 68 % même avec 72 photos.

**Coût de saisie :** une colonne `difficulte` (1, 2 ou 3) dans `credits.csv`, soit quelques secondes par photo (moins de 15 min pour 90 photos) ; le script refuse une ligne où elle manque.

**Résultat :** B réduit de moitié les rounds perdus mais casse l'anti-répétition : avec une ou deux photos faciles par site, le joueur revoit la même photo une partie sur trois, et finit par reconnaître la photo plutôt que la centrale. C retire un tiers des rounds perdus en Rapidité (31 % → 21 %) en gardant 0 % de photo revue d'une partie à la suivante ; en contrepartie, un joueur qui alterne les modes voit surtout les photos difficiles en Distance (56 %), où il a tout son temps.

**Choix retenu : C.** Une difficulté par photo, **obligatoire et saisie à la main** (1 facile : vue d'ensemble reconnaissable en quelques secondes par un connaisseur ; 2 moyenne : vue partielle ou aérienne qui demande de réfléchir ; 3 difficile : détail ou angle inhabituel). Le mode **Rapidité n'utilise que les photos de difficulté 1 et 2** (`RAPIDITE_DIFFICULTE_MAX = 2`), le mode **Distance les utilise toutes**. Si un site n'a aucune photo de difficulté ≤ 2, toutes ses photos restent tirables. Règle de sourcing associée : **au moins 2 photos de difficulté 1 ou 2 par site** (le script le signale).

**Raison :** en Rapidité, une photo de détail est presque toujours un round perdu en 20 s : c'est de la frustration, pas de la tension. En Distance, sans limite de temps, la même photo devient une énigme intéressante (fleuve ou mer, relief, type de bâtiment). Exclure les seules photos difficiles préserve la rotation, alors que garder uniquement les faciles la détruit. Une échelle à 3 niveaux se saisit sans hésiter ; elle pourra être recalibrée en phase 8 à partir des taux de réussite réels.

### 2.2 Version basse résolution pendant le chargement

**Question :** faut-il une version basse résolution (≈ 400 px, floutée) à afficher pendant le chargement de la photo ?

**Options testées :**
- **A** — rien : fond neutre et indicateur de chargement, la photo apparaît d'un coup, le chrono démarre à ce moment ;
- **B** — fichier 400 px flouté, chargé avant la vraie photo ;
- **C** — aperçu minuscule (16 px) en base64 dans `photos.json` (LQIP), agrandi et flouté en CSS ;
- et, en complément de A, la profondeur du préchargement (1 ou 2 rounds d'avance, ou toute la partie).

**Test :** poids mesurés sur 19 photos de paysage (fonds d'écran de Windows, pas des photos de centrale) : 1600 px WebP qualité 80 : médiane 39 Ko, maximum 111 Ko ; une vraie photo industrielle détaillée est plus lourde, d'où un plafond de 300 Ko imposé par le script (qualité baissée par pas de 5 jusqu'à 60). 400 px flouté : 1 à 2 Ko. LQIP 16 px : ≈ 120 octets en base64 (11 Ko pour 90 photos). Temps de chargement d'une photo de 150 / 300 Ko : 0,9 / 1,7 s en 4G lente (1,6 Mbit/s, 150 ms) ; 5,1 / 8,1 s en 3G lente (0,4 Mbit/s, 2 s de latence) ; l'aperçu 400 px met lui-même 2 s à arriver en 3G lente (la latence domine). Puis 5 000 parties de Rapidité simulées par profil, photos de 150 à 300 Ko, 5 s passées sur l'accueil :

| Attente totale par partie (Rapidité) | Expert | Moyen | Débutant |
|---|---|---|---|
| 4G lente, préchargement du round suivant | 0 s | 0 s | 0 s |
| 3G lente, préchargement du round suivant | 8,2 s | 2,6 s | 1,7 s |
| **3G lente, 2 rounds d'avance** | **5,4 s** | **1,8 s** | **1,6 s** |
| 3G lente, les 8 photos en file dès l'accueil | 5,4 s | 1,8 s | 1,6 s |

**Résultat :** en 4G, même lente, le préchargement suffit : le joueur n'attend jamais, et l'aperçu ne serait jamais vu. En 3G lente, l'attente vient de la latence et de la bande passante ; un aperçu 400 px arrive trop tard pour servir (2 s), et un aperçu flou montré avant le chrono offre du temps de réflexion gratuit (mer ou fleuve, nombre de tours de refroidissement), ce qui fausse le mode Rapidité. Précharger 2 rounds d'avance réduit l'attente d'un tiers pour un joueur rapide ; tout précharger n'apporte rien de plus et consomme des données si le joueur abandonne.

**Choix retenu : A, pas de version basse résolution en v1.** Pendant le chargement : fond neutre et indicateur de chargement ; le chrono démarre quand la vraie photo est affichée (phase 0). Préchargement **2 rounds d'avance** (`PHOTOS_PRECHARGEMENT_AVANCE = 2`), en commençant dès l'écran d'accueil. Photos plafonnées à **300 Ko** (1600 px, WebP qualité 80, abaissée si nécessaire).

**Raison :** l'aperçu flou n'améliore l'expérience que sur un réseau où il arrive lui-même trop tard, et il crée une iniquité en Rapidité. Le préchargement plus profond et le plafond de poids règlent le vrai problème, sans fichier ni champ supplémentaire à maintenir.

### 2.3 Remplacement des images de substitution

**Question (choix d'outillage) :** quand de vraies photos arrivent pour un site, que deviennent ses 3 images de test ?

**Choix retenu :** elles sont **retirées dès que le site a au moins une vraie photo** (`process_photos.py` s'en charge, et `generate_placeholders.py` n'en recrée pas pour ce site).

**Raison :** une image de test est impossible à reconnaître : la laisser à côté d'une vraie photo ne ferait que produire des rounds perdus d'avance. Un site avec une seule vraie photo la remontre à chaque fois qu'il sort, ce qui est moins gênant ; le script signale tous les sites qui n'ont pas encore 3 vraies photos. Avant la mise en ligne, il ne doit plus rester aucun substitut (`substitut: true`).

---

## Phase 3 — Direction artistique

**Prototypes et tests :** tout est dans [`design/`](../design/) ; synthèse illustrée dans [`design/CHOIX.md`](../design/CHOIX.md), guide d'usage des tokens dans [`design/TOKENS.md`](../design/TOKENS.md). Les prototypes HTML s'ouvrent par un double-clic et sont jouables. Les tests ne demandent aucune dépendance dans le dépôt (Playwright et fontTools sont installés dans un dossier temporaire, le navigateur est Microsoft Edge) :

| Script | Question |
|---|---|
| `node design/outils/capturer.mjs` (avec `PW_DIR`) | captures à 1280 × 800 et 360 × 400, mesures de mise en page (`design/tests/mesures.json`) |
| `python -I design/tests/contraste.py` | 3.3 Contraste WCAG de chaque paire de couleurs (lit `src/styles/tokens.css`) |
| `python -I design/tests/barre_temps.py` | 3.4 Ce que chaque barre de temps donne à lire, et visibilité du −2 s |
| `python -I design/tests/daltonisme.py` | 3.3 Simulation de deutéranopie et de protanopie |
| `design/tests/glyphes.html` | 3.3 Glyphes ambigus, stabilité et hauteur des chiffres |

Les valeurs retenues sont réglables dans [`src/styles/tokens.css`](../src/styles/tokens.css) (fichier unique, variables commentées). Les choix sont **proposés** : la direction doit encore être validée avec la promo.

### 3.1 Maquettes : Figma ou prototypes HTML

**Question :** dessiner les maquettes dans Figma, ou prototyper directement en HTML ?

**Options :** Figma (gratuit) ; prototypes HTML autonomes.

**Test :** aucun test comparatif : la consigne de la phase impose les prototypes HTML.

**Choix retenu : prototypes HTML autonomes** (un fichier par direction, polices et tokens embarqués, jouable sans serveur).

**Raison :** les questions de cette phase portent sur des choses qu'une image fixe ne montre pas : le défilement du chrono, le saut de −2 s, la secousse, le clavier virtuel sur mobile. Le HTML permet aussi de **mesurer** (taille de la photo, contraste, pixels de la barre) et sert directement de référence aux phases 4-5, avec les mêmes tokens CSS que le jeu. Pas de compte ni d'outil à installer pour la promo : un double-clic suffit.

### 3.2 Direction artistique de l'écran Rapidité

**Question :** quelle direction pour l'écran de jeu du mode Rapidité, le plus contraint ?

**Options testées :**
- **A « Synoptique »** (salle de commande) : bandeau d'instrumentation, photo cadrée comme un moniteur, pupitre de saisie à droite, barre graduée sous la photo ;
- **B « Plan technique »** : cadre de dessin avec repères, fond quadrillé façon carte des nucléides, temps restant affiché comme une cote, cartouche.

**Test :** les deux prototypes à 1280 × 800 et à 360 × 400 (mobile avec clavier virtuel ouvert), en jeu, après une erreur, après une bonne réponse ; mesures dans le navigateur.

| Critère | A | B |
|---|---|---|
| Photo, part de l'écran (bureau / mobile) | **56 % / 48 %** | 44 % / 41 % |
| Position du chrono | fixe | se déplace avec la cote |
| Essais barrés visibles sur mobile | oui | non |
| Suggestions à 1280 × 800 | dans le pupitre | débordent du cadre |

**Résultat :** A montre une photo 27 % plus grande sur bureau (17 % sur mobile), garde le chrono immobile et a une place naturelle pour les suggestions et les essais. B est le plus original, mais son ornement coûte de la place et le chrono mobile se lit moins vite.

**Choix proposé : direction A « Synoptique »**, à valider avec la promo. On garde de B le cartouche et le tableau de relevé pour l'écran de fin.

**Raison :** la lisibilité en jeu passe avant l'originalité : en 20 s, le joueur regarde la photo, le champ et le temps, rien d'autre. A reste typée (filets, libellés d'instrument, voyants, asymétrie) sans rien prendre à la photo.

### 3.3 Typographie et palette

**Question :** quelle paire de polices (texte + chasse fixe pour les chiffres), et quelle palette ?

**Options testées :**
- typographie : **IBM Plex Sans + IBM Plex Mono** ; Space Grotesk + JetBrains Mono ; Barlow Semi Condensed + Space Mono ;
- palette : **Tcherenkov** (fond bleu nuit `#0a0e13`, accent `#4db8ff`) ; Graphite (fond neutre `#0d0d0e`, accent `#3d8bff`).

**Test :** les trois paires dans le prototype A à 360 × 400 ; planche de glyphes (0/O, 1/l/I, 5/S, 8/B) ; largeur du chrono de « 0,0 » à « 20,0 » ; hauteur réelle d'un chiffre ; poids des fichiers ; contraste WCAG de 24 paires texte/fond (accent, statuts, texte fantôme et carte compris) ; simulation de deutéranopie et de protanopie.

| Police à chasse fixe | Glyphes ambigus | Écart de largeur du chrono | Chiffre à 28 px | Poids (400 + 600) |
|---|---|---|---|---|
| **IBM Plex Mono** | tous distincts, zéro pointé | 0 px | 20 px | **30 Ko** |
| JetBrains Mono | tous distincts, zéro pointé | 0 px | 22 px | 43 Ko |
| Space Mono | distincts, 1 très typé | 0 px | 19 px | 33 Ko |

| Contraste (WCAG AA) | Tcherenkov | Graphite |
|---|---|---|
| Texte fantôme / champ | 5,36 | 4,96 |
| Accent (chrono) / fond | 8,86 | 5,86 |
| Texte du bouton / accent | 8,65 | 3,31 ✕ |
| Succès / fond, erreur / fond | 10,39 / 6,93 | 8,77 / 5,76 |
| Paires en échec | **0 sur 24** | 3 sur 24 |

**Résultat :** les trois polices à chasse fixe lèvent les ambiguïtés et gardent un chrono stable ; les polices de texte confondent I et l, d'où la règle « tous les chiffres en chasse fixe ». Plex est la plus légère et forme une vraie famille ; JetBrains a des chiffres 10 % plus hauts, compensés en portant le chrono mobile à 30 px. Tcherenkov passe tous les contrastes, Graphite en rate trois. En deutéranopie, succès et erreur restent distincts mais proches (ΔE 28) : d'où la règle couleur + forme.

**Choix retenu :**
- **IBM Plex Sans (400, 600) + IBM Plex Mono (400, 600)**, WOFF2 latin auto-hébergés dans `public/fonts/` (OFL), **77 Ko au total** ;
- **palette Tcherenkov** : fond `#0a0e13`, surfaces `#10161d` / `#161e27`, textes `#e4eaf0` / `#a3afbc` / `#8593a2`, accent unique `#4db8ff`, succès `#5fd39a`, erreur `#ff6b5e` ;
- statuts toujours doublés d'une forme (✓ / ✕ dessinés en SVG, barré, hachures, texte).

**Raison :** une famille unique, dessinée pour des documents techniques, donne un ton « ingénierie » sans effet de mode, pour le plus petit poids. La palette Tcherenkov est la seule à passer tous les contrastes, et son fond bleuté accorde l'accent au reste de l'écran.

### 3.4 Métaphores visuelles

**Question :** barre de temps en décroissance exponentielle ou en insertion de barres de contrôle ? Score en relevé d'instrument ? Écran de fin en compte rendu d'essai ? Jusqu'où aller ?

**Options testées (barre de temps) :** barre linéaire graduée ; aire sous une exponentielle (τ = 5 s) ; 20 barres de contrôle qui s'insèrent (une par seconde).

**Test :** captures de chaque barre à 15, 10 et 5 s restantes ; part de bleu affichée (ce que l'œil lit) comparée à la part de temps réellement restante ; pixels rouges juste après une erreur.

| Restant | Linéaire | Exponentielle | Barres de contrôle |
|---|---|---|---|
| 15 s (75 %) | 75 % | 32 % | 75 % |
| 10 s (50 %) | 50 % | 9 % | 50 % |
| 5 s (25 %) | 25 % | 1 % | 25 % |
| Rouge après une erreur | 7,8 % + « −2 s » | 6,1 % | 12,2 % |

**Résultat :** l'exponentielle ment de 5 à 9 s sur le temps restant : à mi-temps, elle affiche 9 % de bleu. Linéaire et barres de contrôle disent la vérité ; les barres rendent le −2 s plus visible, mais prennent 28 px de haut au lieu de 12, ce qui compte sur mobile, et leur métaphore demande une explication.

**Choix retenu :**
- **barre de temps linéaire de 12 px, graduée à la seconde** (étiquettes 0-5-10-15-20), rouge sous 5 s, chrono numérique à côté ; le segment perdu reste hachuré 0,9 s avec « −2 s » ;
- **score en relevé d'instrument, version légère** : libellé en petites capitales, valeur en chasse fixe, « / 8 000 » en gris, sans animation ;
- **écran de fin en compte rendu d'essai, version légère** : en-tête « Compte rendu d'essai · Essai n° … », total, trois mesures et tableau de relevé round par round ; pas de faux tampon ni de signature.

**Raison :** une métaphore n'est gardée que si elle ne coûte rien à la lecture. Le temps s'écoule linéairement, la barre doit donc l'être ; les graduations à la seconde reprennent l'idée des barres de contrôle (on compte les crans) sans en payer le prix. Le relevé d'instrument et le compte rendu d'essai ne changent que la forme (libellés, tableau), pas la lisibilité.

> Scripts des simulations de la phase 2 : `python scripts/sim/photos-difficulte.py`, `python scripts/sim/photos-chargement.py`, `python scripts/sim/photos-mesure-lqip.py`.

---

## Phase 4 — Socle technique

**Architecture et commandes :** [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Vérifications : `npm run lint` (ESLint + svelte-check), `npm test` (Vitest, 62 tests au total), `npm run build`.

Les tests de cette phase ont été faits **hors du dépôt** (dossier temporaire) : le même mini-écran monté dans chaque option, construit avec Vite 8 en production, puis mesuré dans Microsoft Edge sans tête (Playwright) avec un réseau « 4G lente » (1,6 Mbit/s, 150 ms) et un processeur ralenti 4 fois (téléphone d'entrée de gamme). Le routage a été testé derrière un petit serveur qui imite GitHub Pages (site servi sous `/NucGuessr/`, 404 pour toute autre adresse).

### 4.1 Framework d'interface

**Question :** TypeScript sans framework, ou un framework léger (Svelte, Preact) ?

**Options testées :** TypeScript seul (DOM manipulé à la main) ; **Svelte 5** ; Preact 11 (JSX + hooks).

**Test :** un mini-écran identique dans les trois : chrono de 20 s animé (`requestAnimationFrame` + `performance.now()`), champ de saisie (`Entrée` valide, mauvaise réponse = −2 s), bouton « Rejouer » qui prend le focus.

| | TypeScript seul | **Svelte 5** | Preact 11 |
|---|---|---|---|
| JS de production, gzip | 0,9 Ko | **16,9 Ko** | 6,4 Ko |
| Lignes de code (hors lignes vides) | 34 | **36** | 41 |
| Écran prêt (4G lente, CPU ×4) | 445 ms | **678 ms** | 528 ms |
| Script par image du chrono (CPU ×4) | 0,18 ms | **0,61 ms** | 0,68 ms |
| Images de plus de 25 ms sur 180 | 0 | **0** | 0 |

**Résultat :** les trois sont parfaitement fluides (moins d'1 ms de script par image, aucune image sautée, même sur un téléphone lent) et très loin du budget de 200 Ko : l'écart de chargement (≤ 0,25 s, une seule fois, puis en cache) est petit devant une seule photo (0,9 à 1,7 s en 4G lente). La différence est dans la maintenance : sans framework, chaque écran (accueil, deux modes, réponse, compte rendu) doit mettre à jour le DOM à la main, ce qui grossit vite et casse facilement ; Preact demande de maîtriser les hooks (le chrono du test a dû passer ses dépendances à `useEffect` pour ne pas lire un état périmé). Svelte s'écrit comme du HTML, ses styles sont **isolés par composant**, ce qui permet aux phases 5 et 6 de styler chacune leur mode dans leur dossier sans toucher une feuille commune. Socle complet mesuré : **36,8 Ko de JS + 4,4 Ko de CSS gzip** (dont 6 Ko de données des sites et des photos), soit 21 % du budget.

**Choix retenu : Svelte 5** (runes), avec Vite 8 et TypeScript strict.

**Raison :** à fluidité égale pour le joueur, c'est l'option la plus simple à lire et à modifier pour des étudiants (gabarit HTML, CSS à côté, état réactif sans piège), et la seule qui isole les styles de chaque mode, ce qui compte pour deux modes développés en parallèle. Preact reste une bonne option de repli si le poids devenait critique (−10 Ko).

### 4.2 CSS : natif ou Tailwind / bibliothèque de composants

**Question :** écrire le CSS à la main avec les tokens de la phase 3, ou utiliser Tailwind ou une bibliothèque de composants ?

**Options testées :** **CSS natif + variables de `tokens.css`** (styles isolés des composants Svelte) ; Tailwind 4 branché sur les tokens (`@theme`) ; bibliothèque de composants (écartée sans montage : ses rayons, ombres et palettes contredisent les règles 2 et 7 de `design/TOKENS.md`).

**Test :** le même fragment (bandeau avec libellé d'instrument, chrono, bouton principal avec `kbd`) en CSS natif et en Tailwind 4.

| | **CSS natif + tokens** | Tailwind 4 + tokens |
|---|---|---|
| CSS de production, gzip | **1,2 Ko** | 3,0 Ko |
| Longueur des attributs `class` | **78 caractères** | 539 caractères |
| Tokens utilisés tels quels | **tous** | via des valeurs arbitraires (`text-[length:var(--taille-micro)]`) ou des équivalents Tailwind qui contournent les tokens (`h-13`, `px-6`) |

**Résultat :** le poids ne départage pas (quelques Ko). Tailwind rend le balisage 7 fois plus long et, surtout, met à portée de main ses propres valeurs par défaut (gris, `rounded-lg`, `shadow`), exactement le look générique à éviter ; pour rester dans les tokens, il faut des valeurs arbitraires partout.

**Choix retenu : CSS natif + tokens**, sans Tailwind ni bibliothèque de composants. Styles communs dans `src/styles/base.css`, styles propres à un composant dans son bloc `<style>`. Les quelques valeurs ajoutées par le socle sont des tokens à part, dans `src/styles/tokens-socle.css` (`--trait-fort`, `--halo-focus`, `--largeur-pupitre`, `--hauteur-bandeau`…), pour ne pas toucher `tokens.css`.

**Raison :** les tokens de la phase 3 sont déjà le système de design ; les utiliser directement est le plus simple et le plus lisible, et rien n'incite à sortir de la direction « Synoptique ».

### 4.3 Routage

**Question :** routage par hash (`#/rapidite`), état interne sans URL, ou adresses « propres » (`/NucGuessr/rapidite`, History API) ?

**Options testées :** hash ; état interne ; History API.

**Test :** sur un site servi comme GitHub Pages sous `/NucGuessr/` : lancer une partie, puis bouton Précédent du navigateur, rechargement de la page, et ouverture d'un lien partagé dans un nouvel onglet.

| | URL en partie | Précédent | Rechargement | Lien partagé |
|---|---|---|---|---|
| **Hash** | `…/#/rapidite` | **retour à l'accueil** | **page servie** | **HTTP 200** |
| État interne | `…/` | **quitte le jeu** | retour à l'accueil | ne mène qu'à l'accueil |
| History API | `…/rapidite` | retour à l'accueil | **page 404** | **HTTP 404** |

**Résultat :** sans URL, le geste le plus naturel sur mobile (retour arrière) fait quitter le site en pleine partie. Les adresses « propres » tombent sur la page 404 de GitHub Pages au rechargement et sur un lien partagé (il faudrait l'astuce d'un `404.html` qui redirige). Le hash n'a aucun de ces défauts et ne demande rien au serveur.

**Choix retenu : routage par hash** : `#/` accueil, `#/<mode>` partie (le compte rendu reste à la même adresse ; « Rejouer » ne change pas l'adresse). Précisions :
- **arrivée directe sur `#/<mode>`** (lien partagé, rechargement) : on affiche l'accueil avec ce mode présélectionné, plutôt que de lancer un chronomètre de 20 s sur un joueur qui n'est pas prêt ; une partie interrompue par un rechargement n'est pas reprise ;
- **Précédent** pendant une partie : retour à l'accueil, partie abandonnée (non comptée dans les meilleurs scores) ;
- **Rapidité est présélectionné à chaque visite** ; pendant la visite, l'accueil retient le dernier mode choisi.

**Raison :** c'est la seule option où les gestes habituels du navigateur (retour, rechargement, lien envoyé à un camarade) ne font jamais perdre le joueur ni tomber sur une erreur, sur un hébergement 100 % statique.

### Autres choix du socle

- **`base: './'`** (chemins relatifs) : le même build fonctionne sur GitHub Pages quel que soit le nom du dépôt, en `npm run preview` et sur un autre hébergeur ; `NUCGUESSR_BASE=/NucGuessr/` force un chemin absolu si besoin (phase 7).
- **Préchargement** : la partie est tirée et ses 3 premières photos demandées dès l'accueil (et dès le compte rendu pour « Rejouer ») ; en jeu, 2 rounds d'avance. La photo n'apparaît qu'entièrement décodée (`img.decode()`), puis le socle attend qu'elle soit peinte (deux `requestAnimationFrame`) avant de signaler `onvisible`, qui démarre le chrono. Vérifié avec une photo retardée de 4 s : indicateur de chargement affiché, choix bloqués jusqu'à l'affichage.
- **Historique des photos vues** : une photo est marquée vue au début de son round (numéro de partie incrémenté au lancement de chaque partie, tous modes confondus).
- **Persistance** (`localStorage`, clé `nucguessr`, `STOCKAGE_VERSION = 1`) : lecture tolérante (un champ invalide reprend sa valeur par défaut sans perdre le reste) ; JSON illisible, version inconnue ou migration impossible : on repart de zéro en gardant l'ancien contenu sous `nucguessr.ancien` ; sans `localStorage` (navigation privée stricte), le jeu fonctionne et l'accueil le signale. Les migrations s'ajoutent dans `MIGRATIONS` (`src/lib/stockage.ts`).
- **Mode factice** (« Démonstration », `#/factice`) : listé sur l'accueil en développement seulement (`FACTICE_VISIBLE_EN_PRODUCTION = false`) ; en production, le lien `#/factice` le présélectionne. Il sert d'exemple de mode et de test de bout en bout.
- **Outillage** : ESLint 10 (configuration « flat », TypeScript et Svelte), Prettier 3 (`src/config.ts`, `tokens.css`, `fonts.css`, `tests/data/`, `design/`, `data/`, `docs/`, `scripts/` exclus), `svelte-check` dans `npm run lint`, fins de ligne LF imposées (`.gitattributes`, `.editorconfig`, Prettier). TypeScript 6.0 (et non 7.0 : `typescript-eslint` et `svelte-check` ne le prennent pas encore en charge).

---

## Phase 5 — Mode Rapidité

**Code :** `src/modes/rapidite/` (`recherche.ts` autocomplétion, `chrono.ts` temps, `mesures.ts` compte rendu, `RoundRapidite.svelte` écran) ; réglages dans la section « Mode Rapidité : saisie, retours et barre de temps » de [`src/config.ts`](../src/config.ts) ; tests dans `tests/rapidite/` (89 tests). Les tests de cette phase ont été faits **hors du dépôt** : analyse de l'autocomplétion sur les vraies données (Node), et partie complète dans Microsoft Edge sans tête (Playwright) sur le build servi en local, à 1280 × 800, 360 × 740 et 360 × 400 (clavier virtuel ouvert simulé). Captures : `docs/captures/phase5-*.png`.

### 5.1 `Tab` complète ou valide

**Question :** `Tab` valide-t-il directement la première suggestion, ou la complète-t-il seulement (un second appui, `Entrée`, valide) ?

**Options testées :** `Tab` valide ; **`Tab` complète seulement** (dans les deux cas, `Entrée` valide la saisie exacte, sinon la suggestion en surbrillance).

**Test :** pour chacun des 18 sites et chaque début de son nom (1 à n lettres, 149 débuts), la première suggestion de l'autocomplétion est-elle le bon site ?

| Lettres tapées | 1 | 2 | 3 | 4 et plus |
|---|---|---|---|---|
| Première suggestion fausse | 9/18 (50 %) | 2/18 (11 %) | 1/18 (6 %) | 1/18 (Saint-Alban / Saint-Laurent jusqu'à « Saint-L ») |

**Résultat :** un `Tab` « trop tôt » (1 ou 2 lettres) validerait une mauvaise réponse 1 fois sur 2 ou sur 9, soit −2 s (90 points). Le gain d'un appui en moins est d'environ 0,2 s (9 points) : au-delà de 10 % d'erreur, un `Tab` qui valide coûte plus qu'il ne rapporte. Et le chemin en un seul appui existe déjà : « Tric » + `Entrée` valide la suggestion en surbrillance, affichée dans le champ en texte fantôme.

**Choix retenu : `Tab` complète seulement** (`RAPIDITE_TAB_VALIDE = false`). `Entrée` valide ce qui est affiché : la saisie si elle est un nom exact (nom court, nom complet ou alias), sinon la suggestion en surbrillance. `↑`/`↓` parcourent la liste, `Échap` la ferme puis vide le champ.

**Raison :** `Tab` est la touche de la complétion (terminal, éditeurs) : on l'enfonce par réflexe, sans vérifier. `Entrée` est un geste délibéré, et ce qu'il valide est toujours visible (texte fantôme ou surbrillance). Pas de validation accidentelle, et pas d'appui supplémentaire pour qui tape vite.

### 5.2 Son

**Question :** faut-il du son (tic des dernières secondes, erreur, bonne réponse) ?

**Options :** aucun son ; son désactivé par défaut avec un interrupteur ; son activé.

**Test :** contexte de jeu et coût. On joue en cours, en pause, dans les transports : un son activé par défaut est exclu. Un interrupteur désactivé par défaut demande une commande de plus dans un pupitre déjà plein sur mobile (à 360 × 400 : photo, barre, deux rangées de saisie), une préférence enregistrée, et un `AudioContext` qui ne démarre qu'après un geste du joueur. Côté accessibilité, chaque signal est déjà doublé à l'écran (couleur + forme + texte) et annoncé aux lecteurs d'écran (`aria-live`).

**Résultat :** le son n'apporterait que de la tension, déjà donnée par la barre rouge sous 5 s et le chrono qui marque chaque seconde ; un interrupteur rarement découvert ne vaut pas sa place à l'écran.

**Choix retenu : aucun son en v1.** S'il est demandé par la promo, il s'ajoutera désactivé par défaut, via la préférence `rapidite.son` du profil.

**Raison :** à qualité de jeu égale, le plus simple ; rien ne gêne en cours.

### 5.3 Onglet en arrière-plan pendant un round

**Question :** si le joueur change d'onglet (ou si le téléphone se verrouille) pendant un round : le temps continue, le chronomètre se met en pause, ou le round est perdu ?

**Options testées :** **le temps continue** ; pause ; round perdu tout de suite. Les trois sont implémentées dans `chrono.ts` et testées (`RAPIDITE_ARRIERE_PLAN`).

**Test :** fenêtre d'Edge réduite pendant 6 s en plein round : `requestAnimationFrame` tombe de 60 à moins de 2 images par seconde (10 images en 6 s), mais `performance.now()` avance normalement (6 015 ms) et le chrono affiché au retour est exact (19,1 → 12,8 s). Le chronomètre ne dépend que de l'horloge, jamais du nombre d'images. (Playwright garde l'onglet « visible » au sens de `document.visibilityState` : les cas pause et perdu sont couverts par les tests à horloge injectée.) Scénarios : avec la pause, chercher la photo dans un autre onglet (recherche d'image inversée, ~10 s) devient gratuit ; avec « perdu », un Alt-Tab involontaire ou une notification qui vole le focus coûte le round entier.

**Résultat :** « le temps continue » est le seul choix ni trichable ni punitif : une recherche dans un autre onglet coûte le temps qu'elle prend (45 points par seconde) et ne rapporte presque rien en 20 s ; une interruption involontaire coûte au plus ce round. Au retour, le round se termine aussitôt si le temps est écoulé ; le round suivant ne démarre son chrono qu'à l'affichage de sa photo, onglet visible.

**Choix retenu : le temps continue de s'écouler** (`RAPIDITE_ARRIERE_PLAN = 'continue'`).

**Raison :** équitable pour tous, sans règle à expliquer, et le plus simple.

### 5.4 Autres choix de la phase

- **Proposition qui ne correspond à aucun site** (options : ignorée ; ignorée + suggestion la plus proche). Test : fautes de frappe courantes (lettre oubliée, en trop, inversée) sur les vrais noms : « tricastn », « gravlines », « catenom », « flamanvile », « dampeirre » retrouvent tous le bon site en première suggestion (tolérance : une faute de 4 à 7 lettres, deux au-delà) ; « paris », « xyz » et « Fessenheim » (absente des données) ne proposent rien. **Choix : jamais d'erreur ni de pénalité** ; si rien ne commence par la saisie, la liste propose les sites les plus proches (`RAPIDITE_SUGGERER_APPROCHANTS`) ; si rien n'est proche, `Entrée` affiche « Aucun site ne correspond… : rien n'est compté ». Raison : reconnaître la centrale est la compétence testée, pas l'orthographe. Un nom déjà tenté n'est pas repénalisé (« déjà tenté »).
- **Champ après une mauvaise réponse** (vidé ou texte sélectionné) : même nombre de touches pour retaper un nom ; la sélection fait apparaître sur mobile les poignées et le menu copier-coller, et le nom faux reste affiché, barré, dans les essais. **Choix : vidé** (`RAPIDITE_APRES_ERREUR`).
- **Mobile, clavier virtuel ouvert (360 × 400)** : photo 336 × 193 px (45 % de l'écran), chrono, barre de temps, une rangée de 3 suggestions à toucher (40 px) et le champ, tous visibles sans défilement ; essais barrés posés sur la photo. À 360 × 740 : photo 336 × 533 px. Toucher une suggestion valide directement. Pour que la page se réduise réellement à l'ouverture du clavier (Chrome Android), le round ajoute `interactive-widget=resizes-content` à la balise viewport (à déplacer dans `index.html`, voir ci-dessous) ; Safari iOS l'ignore et fait défiler la page jusqu'au champ.
- **Tension** : sous `RAPIDITE_SEUIL_ALERTE_MS` (5 s), barre et chrono en rouge, et le chrono marque chaque seconde (bref fondu, supprimé si « réduire les animations »). Réglable ou supprimable (0), à valider avec la promo.
- **Fin de partie** : mesures « Temps moyen » (sur les rounds **trouvés** seulement : un round perdu n'a pas de temps de réponse), « Erreurs » (total) et « Perdus » (x/8) ; colonnes « Temps » (temps réel, pénalités non comprises) et « Err. » ; « Votre réponse » d'un round perdu : les noms tentés, sinon « Temps écoulé ».

**À remonter dans le socle (hors périmètre de la phase 5) :** `interactive-widget=resizes-content` dans la balise viewport d'`index.html` ; le journal des rounds précédents dans le pupitre (maquette « Synoptique ») demanderait que le socle passe les résultats précédents au composant `Round`.

---

## Phase 6 — Mode Distance

**Carte et données :** [`docs/CARTE.md`](CARTE.md) (sources Natural Earth, script `scripts/geo/construire-carte.mjs`). Code : `src/modes/distance/`. Tests : `tests/distance/` (17 tests : haversine, aller-retour de projection, recadrage, mise en forme). Réglages : `src/config.ts`, section « Mode Distance : carte ».

Les tests de cette phase ont été faits **hors du dépôt** (dossier temporaire) : prototypes HTML avec les vrais contours Natural Earth, mesurés dans Microsoft Edge sans tête (Playwright) avec un processeur ralenti 4 fois par le protocole DevTools ; analyse de difficulté en Node sur la géométrie Natural Earth brute et les positions de `data/sites.json` ; parties complètes jouées sur le build (`npm run build`) à 1280 × 800 (souris, molette) et à 360 × 740 (gestes tactiles simulés : pincement, glisser, taps), sans erreur dans la console.

### 6.1 Technique de carte

**Question :** carte vectorielle sur mesure (d3-geo + d3-zoom, SVG ou Canvas) ou tuiles (Leaflet / MapLibre) ?

**Options testées :** **SVG sur mesure** (un groupe transformé, traits `vector-effect: non-scaling-stroke`) ; Canvas sur mesure (redessin complet à chaque image) ; tuiles (écartées sans montage, voir la raison).

**Test :** France, voisins et fleuves réels (≈ 7 800 points après simplification), zoom simulé de ×1 à ×16 vers Lyon puis déplacement, pendant 4 s.

| | SVG | Canvas |
|---|---|---|
| Premier rendu, 360 × 740, CPU ×4 | 89 ms | 93 ms |
| Images par seconde, zoom + déplacement, 360 × 740, CPU ×4 | 60 (0 image > 25 ms) | 60 (0 image > 25 ms) |
| Idem à 1280 × 800, CPU ×4 | 60 (0 image > 25 ms) | 60 (0 image > 25 ms) |

Fond de carte final : 34 Ko gzip ; module carte complet (d3 + fond + composant), chargé seulement au premier round Distance : **66 Ko gzip** (+ 1 Ko de CSS). Bundle principal : 37,3 → **41,1 Ko gzip** (+3,8 Ko : écran du round, compte rendu, calcul des distances). Précision : à 360 px de large et au zoom maximal (×24), un pixel couvre 0,14 km et la largeur d'un doigt (40 px) 6 km.

**Résultat :** les deux rendus sur mesure sont parfaitement fluides, même sur un téléphone lent simulé : la carte a peu de points. Le SVG est plus simple (repères, étiquettes et styles en CSS avec les tokens, événements du DOM, accessibilité) ; les tuiles imposeraient un fournisseur externe et ses conditions d'utilisation, un aspect générique, et ne fonctionneraient pas hors ligne.

**Choix retenu : carte sur mesure en SVG**, projection conique conforme de Lambert (parallèles 44° et 49°, méridien 3° E, comme le Lambert-93), zoom ×1 à ×24 (`DISTANCE_ZOOM_MAX`), déplacement borné autour de la France, double tap sans zoom (deux taps reposent le repère). Molette, pincement, boutons `+` / `−` / « toute la France », clavier (flèches, `+`, `−`, `Espace` pose le repère au réticule central).

**Raison :** fluide sur mobile, fidèle à la direction « Synoptique », sans dépendance réseau, et le plus simple à faire évoluer.

### 6.2 Affichage des fleuves

**Question :** afficher les fleuves ? Toujours, jamais, ou seulement en zoomant ?

**Options testées :** aucun fleuve ; grands fleuves toujours affichés ; grands fleuves + affluents dès le départ ; affluents seulement en zoomant.

**Test :** pour les 18 centrales, points moyens d'un joueur qui sait seulement « sur la Loire » (ou « sur le Rhône »…) et clique au hasard le long de ce fleuve, en France : avec les fleuves affichés (clic sur le tracé) et sans fleuves (il se trompe en plus de 20 à 40 km sur la position du fleuve, écart gaussien σ). Le joueur « en bord de mer » ne change pas : la côte est toujours visible. Plus des captures à 360 px.

| Points moyens par round | Hasard complet | Sans fleuves (σ 40 km) | Sans fleuves (σ 20 km) | **Avec fleuves** |
|---|---|---|---|---|
| 13 sites de fleuve | 286 | 1 437 | 1 617 | **1 717** |
| 18 sites | 253 | 1 129 | 1 259 | **1 331** |

**Résultat :** afficher les fleuves ne rapporte que **+100 à +280 points par round** (6 à 19 %) à ce joueur, qui reste à un tiers du maximum : savoir « Loire » ne suffit pas, il faut savoir *où* sur la Loire (4 sites sur la Loire, 4 sur le Rhône). Aucun site n'est déductible du seul fleuve. Sans fleuves, la carte n'offre presque aucun repère à l'intérieur des terres, et le joueur qui connaît le site est pénalisé par sa mémoire du tracé plutôt que récompensé pour sa connaissance des centrales. Avec les affluents dès la vue de départ, la carte est chargée à 360 px.

**Choix retenu : les 8 grands fleuves toujours affichés** (Loire, Rhône, Seine, Garonne, Meuse, Moselle, Vienne, Rhin ; la Gironde est visible comme estuaire dans le tracé de la côte), **les 25 affluents à partir du zoom ×3** (`DISTANCE_ZOOM_FLEUVES_SECONDAIRES`), sans nom affiché. `DISTANCE_AFFICHER_FLEUVES = false` les retire.

**Raison :** ce sont des repères géographiques justes qui récompensent une connaissance réelle (la source froide fait partie du métier) sans donner la réponse ; le niveau de détail garde la vue de départ lisible.

### 6.3 Repères : limites administratives et villes

**Question :** afficher les limites des régions ou des départements, et quelques grandes villes ?

**Options testées :** rien ; 8 grandes villes ; villes + limites des 13 régions ; limites des départements (poids seulement).

**Test :** captures à 360 px de large, poids gzip, distance de chaque centrale à la ville repère la plus proche.

**Résultat :** les limites des régions coûtent 8 Ko gzip (départements : 24 Ko) et ajoutent des traits gris qu'on confond avec les fleuves à petite taille ; les départements sont un repère que peu de joueurs maîtrisent. Les villes se lisent bien et ne sont jamais la réponse : la centrale la plus proche d'une ville repère en est à 28 km (Civaux – Poitiers), médiane 60 km, toujours au-delà du rayon « dans le mille ». Elles servent d'ancre (« Saint-Alban, au sud de Lyon »).

**Choix retenu : pas de limites administratives ; 8 grandes villes dès le départ** (Paris, Lyon, Marseille, Lille, Toulouse, Bordeaux, Nantes, Strasbourg) **et 20 autres à partir du zoom ×2,5** (`DISTANCE_ZOOM_VILLES_SECONDAIRES` ; préfectures de région et grandes villes, Ajaccio compris).

**Raison :** les villes aident à se repérer sans encombrer ni donner la réponse ; les limites alourdissent la carte pour un bénéfice faible.

### 6.4 Mise en page photo / carte sur mobile

**Question :** comment montrer la photo et la carte sur un téléphone ?

**Options comparées :** bascule photo / carte (onglets) ; **photo réduite en haut et carte en dessous, photo agrandissable par-dessus la carte** ; carte plein écran avec une vignette de la photo.

**Test :** partie complète à 360 × 740 avec gestes simulés, mesures à 360 × 560 (petit écran, barres du navigateur).

| | Photo visible en visant | Gestes par round | Surfaces à 360 × 740 | à 360 × 560 |
|---|---|---|---|---|
| Bascule (onglets) | non | 5 à 7 (deux bascules en plus) | carte ≈ 336 × 600 | carte ≈ 336 × 420 |
| **Photo réduite + carte** | **oui** | **3 à 5** (pincer, éventuellement glisser, taper, Valider, Suivant) | photo 336 × 206, carte 336 × 384 | photo 336 × 152, carte 336 × 258 |
| Vignette sur la carte | à peine (≈ 120 px de large) | 3 à 5 | carte ≈ 336 × 600 | — |

**Résultat :** avec la photo réduite, on vise en regardant la photo, sans aller-retour, et tout tient sans défilement même à 360 × 560. La bascule double presque le nombre de gestes et oblige à mémoriser la photo ; la vignette est trop petite pour reconnaître un site. Le bouton « Agrandir » montre la photo entière (sans recadrage) par-dessus la carte, sans changer la taille ni le zoom de la carte.

**Choix retenu : photo réduite en haut (30 % de la hauteur), carte au milieu, pupitre en bas** (consigne et « Valider », puis fiche et « Suivant ») ; bouton « Agrandir / Réduire » sur la photo. Sur ordinateur : photo et pupitre à gauche (2/5), carte à droite (3/5), côte à côte.

**Raison :** c'est l'option qui demande le moins de gestes et garde la photo sous les yeux pendant qu'on vise.

### Autres choix de la phase

- **Repère** : un tap ou un clic le pose, un autre tap le repose ailleurs, on peut aussi le faire glisser ; un glisser de plus de 6 px (`DISTANCE_TOLERANCE_TAP_PX`) ou un pincement ne pose rien. « Valider » (ou `Entrée`) n'est actif qu'avec un repère posé.
- **Réponse** : losange blanc de la position réelle, trait en tirets, étiquette de distance, recadrage animé (700 ms, `DISTANCE_RECADRAGE_MS`, zoom ×8 au plus ; instantané si `prefers-reduced-motion`, vérifié), bande de réponse sur la photo (distance, points), fiche courte (site, réacteurs, source froide). Statut « juste » (✓) seulement dans le mille (≤ 5 km), sinon neutre. Le joueur passe au round suivant par « Suivant » ou `Entrée` et peut encore manipuler la carte.
- **Compte rendu** : mesures « Distance moyenne », « Meilleur repère », « Dans le mille » ; colonne « Distance » ; « Votre réponse » nomme la centrale la plus proche du repère (« Près de Cruas », à moins de 40 km) ou indique « Loin des centrales » ; carte récapitulative avec les 5 repères reliés aux 5 positions réelles numérotées.
- **Chargement différé** : d3 et le fond de carte sont dans un module à part, téléchargé au premier round Distance (ou par la carte récapitulative) ; l'accueil et le mode Rapidité ne le chargent pas.
- **Distance** : formule de haversine sur une sphère de 6 371,0088 km (rayon moyen IUGG) ; écart à la distance géodésique sur l'ellipsoïde inférieur à 0,5 %, sans effet notable sur le score.
