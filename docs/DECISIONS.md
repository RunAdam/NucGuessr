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
