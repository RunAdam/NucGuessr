# NucGuessr — Moodboard (phase 3)

Moodboard textuel : aucune image téléchargée. Chaque référence est décrite par ce qu'on en retient pour l'interface, et ce qu'on en écarte. Les échantillons visuels sont dessinés à la main (CSS/SVG) dans les prototypes de ce dossier.

Fil conducteur : **le nucléaire vu de l'intérieur, par des gens du métier.** L'instrumentation, la physique, l'ingénierie. Pas la peur.

---

## 1. Synoptiques de salle de commande

**Référence :** les panneaux et écrans des salles de commande de REP (paliers 900, 1300 MWe, puis N4 avec la conduite informatisée sur écrans) et les simulateurs de formation pleine échelle. Le synoptique représente les circuits (primaire, secondaire, auxiliaires) par des traits fins sur fond sombre ou gris, avec des étiquettes alphanumériques codifiées (`RCP`, `ARE`, `GCT`…), des voyants rectangulaires et des afficheurs numériques.

**On retient :**
- des **filets de 1 px** pour structurer l'écran, plutôt que des cartes et des ombres ;
- des **libellés d'instrument** : petites capitales en chasse fixe, espacées (`ROUND`, `SCORE`, `NOM DU SITE`) ;
- des **voyants** carrés pour l'avancement des rounds (plein = réussi, croix = perdu, contour bleu = en cours) ;
- l'idée qu'un écran de conduite est **dense mais hiérarchisé** : la mesure qui compte est grosse, le reste est petit et calme.

**On écarte :** le gris clair des pupitres anciens (trop terne en mode sombre), les rangées de voyants rouge/vert (le daltonisme, et le cliché « alarme »).

## 2. Afficheurs numériques et instruments de mesure

**Référence :** afficheurs à 7 segments des chaînes de mesure, compteurs, oscilloscopes, enregistreurs papier, échelles graduées des appareils à aiguille, échelles logarithmiques des chaînes neutroniques (source, intermédiaire, puissance).

**On retient :**
- **tous les chiffres en chasse fixe** et tabulaires : la valeur peut défiler sans que rien ne bouge autour ;
- une **échelle graduée** sous la barre de temps : une graduation par seconde, une plus longue toutes les 5 s, étiquetées 0-5-10-15-20 ;
- le chrono lu comme un relevé (« 12,4 s ») avec une unité discrète ;
- l'unité toujours affichée, en plus petit et plus pâle (`s`, `pts`, `km`).

**On écarte :** les afficheurs 7 segments littéraux (police « LCD » : lisibilité médiocre, effet gadget), les échelles logarithmiques pour le temps (le temps s'écoule linéairement : voir le test de la barre).

## 3. Rayonnement Tcherenkov

**Référence :** la lueur bleue d'une piscine de réacteur de recherche (type piscine, comme Osiris ou les réacteurs universitaires) ou d'une piscine d'entreposage du combustible : un bleu électrique, légèrement cyan, sur un fond d'eau profonde presque noir.

**On retient :**
- **un seul accent**, ce bleu (`--c-accent: #4db8ff`), sur un fond quasi noir teinté de bleu nuit (`--c-fond: #0a0e13`) ;
- l'accent signale ce qui est **vivant** : le temps qui reste, le champ actif, la suggestion sélectionnée, le repère du joueur sur la carte.

**On écarte :** le halo lumineux (`glow`, flou, dégradés) qui ferait « néon » ou science-fiction. Le bleu reste un aplat.

| Échantillon | Rôle |
|---|---|
| `#0a0e13` | fond (eau profonde) |
| `#10161d` / `#161e27` | panneaux, champ de saisie |
| `#4db8ff` | accent Tcherenkov |
| `#e4eaf0` / `#a3afbc` / `#8593a2` | trois gris de texte |
| `#5fd39a` / `#ff6b5e` | statuts succès / erreur (toujours doublés d'une forme) |

## 4. Carte des nucléides (diagramme de Segrè)

**Référence :** la carte N-Z des nucléides (Karlsruhe, ou celle du NNDC) : une grille de cases carrées, chaque case portant un symbole, un nombre de masse en exposant et une demi-vie, colorée selon le mode de désintégration.

**On retient :**
- la **case de nucléide** comme symbole du jeu : un élément fictif « Ng » dont le nombre de masse est « ? » (on devine l'isotope), écrit comme ²³⁵U. C'est le favicon et le début du wordmark (`src/assets/wordmark.svg`) ;
- la grille comme **fond quadrillé**, testée dans la direction B.

**On écarte :** les couleurs des modes de désintégration (bleu β⁻, rose β⁺, jaune α…) : trop de couleurs pour une interface à un seul accent.

## 5. Plans techniques

**Référence :** plans d'ensemble et plans de détail (cadre avec repères de zone 1-2-3 / A-B-C, cotes avec lignes d'attache et flèches, cartouche en bas à droite, annotations reliées par des lignes de rappel), schémas isométriques de tuyauterie.

**On retient :**
- le **cartouche** et le **tableau de relevé** pour l'écran de fin (« compte rendu d'essai ») ;
- les **repères d'angle** autour de la photo (direction A), comme le cadre d'un plan ou d'un viseur ;
- le principe de la cote, testé comme barre de temps (direction B).

**On écarte :** le fond bleu « blueprint » et la police manuscrite d'architecte (trop décoratifs, cliché).

## 6. Écarté d'office (section 3.3 de la feuille de route)

- Trèfle radioactif, rayures jaune et noir, vert « toxique », fûts, champignons, Tchernobyl, Simpson.
- Dégradés violet-bleu, glassmorphisme, cartes très arrondies avec ombre, emojis en guise d'icônes (les icônes ✓ / ✕ sont dessinées en SVG), grand titre centré avec deux boutons.
- Animations décoratives : seules restent la barre de temps (le temps qui passe), la secousse et le « −2 s » (l'erreur), la bande de réponse (la révélation).

## 7. Typographies envisagées

| Paire | Esprit | Retenue ? |
|---|---|---|
| **IBM Plex Sans + IBM Plex Mono** | industriel, documentation technique, une seule famille dessinée pour aller ensemble | **oui** |
| Space Grotesk + JetBrains Mono | « tech » contemporain, éditeur de code | non |
| Barlow Semi Condensed + Space Mono | signalétique DIN, plus étroit | non |

Résultats du test de lisibilité : voir [CHOIX.md](CHOIX.md).
