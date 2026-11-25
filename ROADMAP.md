# NucGuessr — Feuille de route

> Reconnaître un site nucléaire français à partir d'une photo, en parties courtes, dans l'esprit de GeoGuessr, TimeGuessr ou Pedantix.

**Contraintes :**
- jouable dans un navigateur, simple d'utilisation, parties de 2 à 5 minutes ;
- **jeu libre** : on enchaîne autant de parties qu'on veut (pas de défi quotidien pour l'instant) ;
- **hébergement gratuit** (public restreint : une promo d'ingénierie nucléaire) ;
- **design soigné et original**, sombre, dans le thème nucléaire, pensé pour des physiciens ;
- maintenance minimale.

**Idée directrice :** un **site 100 % statique**. Le tirage des photos se fait dans le navigateur et les scores sont stockés localement. Pas de serveur ni de base de données.

**Légende :**
- `[ ]` tâche à faire
- ⚠️ **À trancher** : choix incertain, à décider en début d'étape

---

## Les deux modes de jeu (v1)

| | **Rapidité** *(mode par défaut)* | **Distance** |
|---|---|---|
| Principe | Taper le nom du site le plus vite possible | Placer le site sur une carte de France |
| Rounds | 8 | 5 |
| Temps | **20 s par round**, avec barre de temps visible | Pas de limite, ou limite large (2-3 min) |
| Saisie | Autocomplétion (`Nogen` + `Tab` → « Centrale nucléaire de Nogent-sur-Seine ») | Clic ou tap sur la carte, puis validation |
| Erreur | Le champ **vibre**, le joueur peut réessayer | Une seule proposition par round |
| Score | Selon le temps restant (et les erreurs) | Selon la distance en km |

---

## Sommaire

0. [Phase 0 — Cadrage des règles](#phase-0--cadrage-des-règles)
1. [Phase 1 — Données des sites](#phase-1--données-des-sites)
2. [Phase 2 — Photos](#phase-2--photos)
3. [Phase 3 — Direction artistique](#phase-3--direction-artistique)
4. [Phase 4 — Socle technique](#phase-4--socle-technique)
5. [Phase 5 — Mode Rapidité (par défaut)](#phase-5--mode-rapidité-par-défaut)
6. [Phase 6 — Mode Distance](#phase-6--mode-distance)
7. [Phase 7 — Mise en ligne](#phase-7--mise-en-ligne)
8. [Phase 8 — Finitions et retours de la promo](#phase-8--finitions-et-retours-de-la-promo)
9. [Phase 9 — Plus tard](#phase-9--plus-tard)
10. [Annexe — Décisions à trancher](#annexe--récapitulatif-des-décisions-à-trancher)

---

## Phase 0 — Cadrage des règles

**Objectif :** figer les règles des deux modes avant de coder.

### Commun aux deux modes
- [x] Périmètre v1 : **les 18 centrales en exploitation** (Flamanville 3 est rattachée au site de Flamanville).
- [x] Tirage des photos : aléatoire, **sans répéter un site dans une même partie** (8 rounds sur 18 sites, c'est possible).
- [x] Éviter de revoir trop souvent les mêmes photos d'une partie à l'autre : mémoriser en local les dernières photos vues et les tirer moins souvent.
  - ✅ **Décidé : rotation par site.** Sites tirés uniformément, puis, pour chaque site, la photo vue il y a le plus longtemps (jamais vue en priorité). Aucun paramètre, aucun blocage possible, tous les sites sortent aussi souvent ; 0 % de photo revue d'une partie à la suivante (voir [`docs/DECISIONS.md`](docs/DECISIONS.md#01-anti-répétition-des-photos-dune-partie-à-lautre)).
- [x] Écran de fin de partie : score total, récapitulatif round par round (photo, réponse, temps ou distance), fiche courte de chaque site.

### Mode Rapidité
- [x] 8 rounds, 20 s par round. Au-delà, le round est perdu et la réponse s'affiche.
- [x] Réponses fausses illimitées, mais **chaque mauvaise réponse retire 2 s** du temps restant, et la barre fait un saut visible. ✅ *Décidé.* Sans cette pénalité, l'autocomplétion permettrait d'essayer les 18 noms à la suite en moins de 20 s.
- [x] Barème de score.
  - ✅ **Décidé : `score = 100 + 900 × temps_restant / 20`** (100 points pour la bonne réponse + 45 points par seconde restante, 0 si le temps est écoulé), sans malus supplémentaire par erreur. Essayer les noms au hasard rapporte moins qu'une bonne réponse trouvée à 19 s.
- [x] Faut-il un délai entre deux rounds (afficher la réponse 1,5 s), ou enchaîner directement ?
  - ✅ **Décidé : 1,5 s après une bonne réponse, 3 s après un round perdu**, que l'on peut passer avec `Entrée` ou un tap (après 400 ms d'anti-rebond).

### Mode Distance
- [x] 5 rounds, un seul clic validé par round.
- [x] Limite de temps.
  - ✅ **Décidé : aucune.** Une limite de 2-3 min ne raccourcit presque pas les parties et ne pénalise que les joueurs lents, surtout sur mobile.
- [x] Barème de score.
  - ✅ **Décidé : k = 75 km**, avec le rayon de tolérance ci-dessous : `score = 5000 × exp(−max(0, d − 5) / 75)`, maximum 25 000 par partie. « Bon fleuve, mauvais site » (34 à 86 km) garde un tiers à deux tiers des points ; cliquer au centre de la France sans regarder n'en rapporte que 7 %.
- [x] Faut-il donner un bonus pour une précision parfaite (< 5 km) ?
  - ✅ **Décidé : pas de bonus, mais un rayon de tolérance de 5 km** : tout clic à moins de 5 km vaut 5000 points, et le score reste continu au-delà. Le maximum de 25 000 devient atteignable, y compris sur mobile.

Les valeurs sont réglables dans [`src/config.ts`](src/config.ts) ; tests et justifications dans [`docs/DECISIONS.md`](docs/DECISIONS.md).

**Livrable :** une section « Règles du jeu » dans le `README.md`.

---

## Phase 1 — Données des sites

**Objectif :** une source de vérité unique décrivant chaque site.

- [x] Créer `data/sites.json`, avec pour chaque site :
  - `id` (slug stable, ex. `nogent`) ;
  - `nom_complet` (« Centrale nucléaire de Nogent-sur-Seine »), `nom_court` (« Nogent-sur-Seine ») ;
  - `alias` acceptés par l'autocomplétion (« Nogent », « St-Laurent », « Saint-Laurent-des-Eaux ») ;
  - `lat`, `lon` (**position précise de l'îlot nucléaire**, indispensable pour le mode Distance), `commune`, `departement`, `region` ;
  - `exploitant`, `type_site` (centrale pour la v1, prévu pour les autres types de sites plus tard) ;
  - `reacteurs` : nombre, palier(s) (CP0, CP1, CP2, P4, P'4, N4, EPR), puissance ;
  - `source_froide` : nom et type (fleuve / mer / estuaire) ;
  - `mise_en_service`, `statut` ;
  - `anecdote` : 2 ou 3 phrases historiques ou techniques, affichées en fin de partie ;
  - `verification` : statut (`A_VERIFIER` / `VERIFIE`), liste des champs encore à contrôler, notes et sources.
- [ ] Sources : Wikipédia, rapports de l'ASNR, pages EDF, cours. **Vérifier chaque valeur**, coordonnées comprises (contrôle sur les orthophotos IGN).
  - ✅ **Décidé : année du couplage au réseau, par réacteur** (`reacteurs.tranches[].couplage`) ; `mise_en_service` du site = premier couplage. Date la plus vérifiable (PRIS, Wikipédia, EDF) ; la fiche affiche une plage courte par palier (« 6 × 900 MWe (CP1), 1980–1985 »), qui garde l'EPR 2024 de Flamanville et tient sur mobile (voir `docs/decisions-phase1.md`).
  - Reste à vérifier : **18 sites sur 18 `A_VERIFIER`, 80 champs** (`lat`/`lon` et puissances des 18 sites, années de couplage de 10 sites, commune de 4, anecdote de 2). Le détail est dans le champ `verification` de chaque site.
- [x] Définir un schéma (type TypeScript ou JSON Schema) et le valider en CI.
  - ✅ **Décidé : JSON**, validé par `data/schema/sites.schema.json` (JSON Schema 2020-12) avec `npm run validate:data` (à brancher dans le workflow de la phase 7). Le YAML ne gagne que 0,2 Ko compressé, mais coûte 14 Ko de bibliothèque et transforme en nombre un code de département non mis entre guillemets (`01` → `1`).
- [ ] Faire relire les données par 1 ou 2 camarades.

**Livrable :** `data/sites.json` complet pour les 18 centrales.

---

## Phase 2 — Photos

**Objectif :** une banque d'images libres de droits, qui ne trahissent pas la réponse.

### 2.1 Sourcing et droits
- [x] Sources autorisées :
  - **Wikimedia Commons** (CC0, CC BY, CC BY-SA) : afficher l'auteur et la licence, avec un lien vers l'original ;
  - **Orthophotos IGN / Géoplateforme** (licence ouverte Etalab 2.0) ;
  - **photos personnelles** de la promo, avec l'accord explicite de leurs auteurs.
- [x] Sources **interdites** : Google Images, photos de presse EDF, Orano ou CEA sans autorisation, captures Google Maps/Earth.
  - Procédure complète, vérification des licences et check-list anti-triche : [`docs/SOURCING_PHOTOS.md`](docs/SOURCING_PHOTOS.md). Le script refuse les licences NC/ND et les liens vers les sources interdites.
- [x] Créer `data/photos.json` : `id` opaque, `site_id`, `type` (sol / aérienne / satellite / détail), `auteur`, `licence`, `url_source`, `difficulte` (plus `fichier`, `alt`, `largeur`, `hauteur`, `poids_octets`, `substitut`). Schéma : [`data/schema/photos.schema.json`](data/schema/photos.schema.json).
  - ✅ **Décidé : oui, difficulté 1 / 2 / 3 saisie à la main ; le mode Rapidité n'utilise que les difficultés 1 et 2, le mode Distance toutes** (`RAPIDITE_DIFFICULTE_MAX = 2`). Réserver aux seules photos faciles casserait la rotation (photo revue une partie sur trois) ; exclure les difficiles garde 0 % de photo revue d'une partie à la suivante et retire un tiers des rounds perdus en Rapidité. Il faut au moins 2 photos de difficulté 1 ou 2 par site (voir [`docs/decisions-phase2.md`](docs/decisions-phase2.md)).

### 2.2 Anti-triche involontaire
- [x] Noms de fichiers opaques (hash salé du contenu de l'image, jamais de son nom).
- [x] **Suppression de toutes les métadonnées EXIF**, GPS compris (et XMP, profil ICC), vérifiée par les tests.
- [ ] Recadrer ou flouter les panneaux, logos et noms visibles.
  - Outillage prêt, en attente des vraies photos (procédure dans [`docs/SOURCING_PHOTOS.md`](docs/SOURCING_PHOTOS.md#2-préparer-la-photo-anti-triche)).
- [x] Aucun nom de site dans le texte `alt` pendant le round (alt neutre écrit par le script à partir du type).

### 2.3 Traitement automatique
- [x] Script `scripts/process_photos.py` (Pillow) qui prend `photos_sources/` (ignoré par git) et :
  - redimensionne à 1600 px de large au maximum ;
  - convertit en WebP (~150-300 Ko) ;
  - supprime les EXIF et renomme avec un hash ;
  - écrit dans `public/photos/` et met à jour `data/photos.json`.
  - Crédits saisis dans un seul tableau `photos_sources/credits.csv` ; relancer le script ne crée pas de doublon. Tests : `python -m unittest discover scripts/tests`.
  - Images de test : `scripts/generate_placeholders.py` (3 par site, « PHOTO DE TEST », `substitut: true`), retirées dès qu'un site a une vraie photo.
- ✅ **Décidé : pas de version basse résolution en v1.** Fond neutre pendant le chargement, préchargement **2 rounds d'avance** dès l'accueil (`PHOTOS_PRECHARGEMENT_AVANCE = 2`), photos plafonnées à 300 Ko. En 4G le joueur n'attend jamais ; en 3G lente un aperçu arrive lui-même trop tard, et un aperçu flou montré avant le chrono donnerait du temps de réflexion gratuit en Rapidité.

### 2.4 Volume
- [ ] Objectif v1 : **3 à 5 photos par site**, soit 55 à 90 photos. En jeu libre, il n'y a pas de calendrier à remplir, mais plus la banque est grande, moins on reconnaît la photo plutôt que le site.
  - Outillage prêt, en attente des vraies photos : en attendant, 54 images de test (3 par site) rendent le jeu jouable de bout en bout. Le script affiche le bilan par site.
- [ ] Varier les angles pour chaque site : vue lointaine, aérienne, détail.
  - Outillage prêt, en attente des vraies photos (conseils de variété dans [`docs/SOURCING_PHOTOS.md`](docs/SOURCING_PHOTOS.md#7-conseils-de-variété)).

**Livrable :** des photos traitées et `data/photos.json` avec les crédits complets.

---

## Phase 3 — Direction artistique

**Objectif :** une identité visuelle propre au jeu, sombre, crédible pour des physiciens, et qui ne ressemble pas à un site généré à la chaîne.

### 3.1 Principes
- **Sombre par défaut** (pas de mode clair prévu en v1).
- **Thème nucléaire vu de l'intérieur**, par des gens du métier : l'instrumentation, la physique, l'ingénierie. Pas la peur.
- **Lisibilité en jeu avant tout** : en mode Rapidité, on a 20 s. La photo, le champ de saisie et la barre de temps doivent se lire d'un coup d'œil.

### 3.2 Pistes d'inspiration (à explorer en moodboard)
- **Rayonnement Tcherenkov** : le bleu caractéristique d'une piscine de réacteur, comme couleur d'accent unique sur fond très sombre.
- **Salle de commande et synoptiques** : tracés de schémas de circuits (primaire, secondaire), voyants, afficheurs à segments, typographies d'instrumentation.
- **Carte des nucléides** (diagramme de Segrè) : une grille comme motif de fond, ou comme système de mise en page.
- **Plans techniques** : traits fins, cotes, cartouches, annotations en marge.
- **Instruments de mesure** : oscilloscope, échelles logarithmiques, compteurs.
- **Métaphores de jeu** possibles, à n'utiliser que si elles restent lisibles :
  - la barre de temps vue comme une **décroissance radioactive** (courbe exponentielle) ou une **insertion des barres de contrôle** ;
  - le score affiché comme un relevé d'instrument ;
  - l'écran de fin vu comme un **compte rendu d'essai**.
  - ✅ **Décidé : métaphores légères.** Barre de temps **linéaire graduée à la seconde** (l'exponentielle ment : à mi-temps elle n'affiche que 9 % de bleu ; les crans d'une seconde reprennent l'idée des barres de contrôle), score en relevé d'instrument sans animation, écran de fin en compte rendu d'essai (tableau de relevé, sans faux tampon). Voir [`design/CHOIX.md`](design/CHOIX.md).

### 3.3 À éviter
- **Clichés anti-nucléaires ou alarmistes** : trèfle radioactif à toutes les sauces, vert « toxique » fluo, fûts suintants, rayures jaune et noir, champignons atomiques, références Tchernobyl ou Simpson.
- **Le style « généré par IA »** :
  - dégradés violet-bleu génériques, glassmorphisme, cartes aux coins très arrondis avec ombre portée partout ;
  - grand titre centré avec sous-titre et deux boutons ;
  - emojis en guise d'icônes, illustrations 3D brillantes ;
  - mise en page symétrique sans parti pris ;
  - police par défaut (Inter / system-ui) sans choix assumé.
- Les animations gratuites. Chaque animation doit avoir un rôle : signaler une erreur, montrer le temps qui passe, révéler une réponse.

### 3.4 Démarche
- [x] Constituer un moodboard (captures de salles de commande, schémas, typographies, photos de piscines de réacteur) : [`design/MOODBOARD.md`](design/MOODBOARD.md), textuel, sans image téléchargée.
- [x] Produire **2 ou 3 directions** sous forme de maquettes rapides de l'écran de jeu du mode Rapidité (le plus contraint) : A « Synoptique » et B « Plan technique », jouables, à 1280 et 360 px.
  - [ ] Choix proposé : **A « Synoptique »** (photo 27 % plus grande, chrono immobile), à valider avec la promo.
  - ✅ **Décidé : prototypes HTML autonomes** (`design/*.html`, un double-clic suffit) : ils montrent le temps qui défile, le −2 s et le clavier mobile, et permettent de mesurer.
- [x] Choisir la typographie : une police pour les titres et le texte, et une police à chasse fixe pour les chiffres (temps, score, distances).
  - Toutes les polices doivent être sous licence libre (OFL) et auto-hébergées, sans dépendre de Google Fonts.
  - ✅ **Décidé : IBM Plex Sans + IBM Plex Mono** (400 et 600, WOFF2 latin dans `public/fonts/`, 77 Ko au total), préférées à Space Grotesk + JetBrains Mono et Barlow + Space Mono : glyphes 0/O et 1/l/I distincts, chrono de largeur fixe, famille unique et la plus légère.
- [x] Définir une palette restreinte : fond quasi noir légèrement teinté, 2-3 gris, **un seul accent** (bleu Tcherenkov), et des couleurs de statut sobres (succès, erreur).
  - Les couleurs ne doivent pas être le seul indicateur (pensez aux daltoniens).
  - Contraste conforme WCAG AA.
  - ✅ **Décidé : palette « Tcherenkov »** : fond `#0a0e13`, surfaces `#10161d` / `#161e27`, textes `#e4eaf0` / `#a3afbc` / `#8593a2`, accent unique `#4db8ff`, succès `#5fd39a`, erreur `#ff6b5e`. 0 échec WCAG AA sur 24 paires (texte fantôme 5,4:1, accent 8,9:1), contre 3 pour la palette « Graphite » ; statuts toujours doublés d'une forme (✓ / ✕, barré, hachures), vérifié en deutéranopie simulée.
- [x] Concevoir l'identité : logo ou wordmark « NucGuessr » et favicon : case de la carte des nucléides « ?Ng » (isotope à deviner), `src/assets/wordmark.svg`, `public/favicon.svg` + PNG 32 px et 180 px.
- [x] Traduire tout cela en **design tokens** (variables CSS : couleurs, espacements, rayons, durées d'animation), utilisés partout dans le code : `src/styles/tokens.css` et `src/styles/fonts.css`, guide [`design/TOKENS.md`](design/TOKENS.md) pour les phases 4 à 6.
- [x] Style de la carte du mode Distance, en cohérence avec le reste du design (voir phase 6) : traits fins sur fond sombre, tokens `--carte-*`, échantillon `design/carte-style.svg`.

**Livrable :** maquettes validées, tokens CSS, polices et logo.

---

## Phase 4 — Socle technique

**Objectif :** la structure commune aux deux modes.

### 4.1 Stack
- [x] **Vite + TypeScript**.
  - ✅ **Décidé : Svelte 5** (Vite 8, TypeScript strict). Les trois options testées sont fluides même sur un téléphone lent (< 1 ms de script par image du chrono) ; Svelte coûte 10 Ko de plus que Preact mais s'écrit comme du HTML et isole les styles de chaque mode (phases 5 et 6 en parallèle). Socle complet : 41 Ko de JS + CSS gzip, 21 % du budget (voir [`docs/DECISIONS.md`](docs/DECISIONS.md#41-framework-dinterface)).
- [x] CSS : du CSS natif avec les tokens de la phase 3.
  - ✅ **Décidé : CSS natif + tokens, sans Tailwind ni bibliothèque de composants.** Avec Tailwind, le balisage est 7 fois plus long et ses valeurs par défaut (gris, arrondis, ombres) contournent les tokens ; les styles d'un composant vivent dans son bloc `<style>` Svelte.
- [x] ESLint + Prettier, et **Vitest** pour la logique pure (tirage, scores, normalisation des noms, distance). `npm run lint` (ESLint + svelte-check), `npm run format`, `npm test` ; la normalisation des noms et la distance seront testées en phases 5 et 6.

### 4.2 Architecture
- [x] Moteur de partie générique : liste de rounds, round courant, score, état (en cours / réponse affichée / terminé), utilisé par les deux modes (`src/lib/moteur.ts`). Chaque mode fournit son écran de round, ses points et son compte rendu via une interface commune (`src/modes/types.ts`, voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).
- [x] Module de tirage : choix aléatoire sans répéter un site dans la partie, avec historique local (voir phase 0) : rotation par site et `photosTirables` (`src/lib/tirage.ts`).
- [x] **Préchargement des photos** : charger la photo du round suivant pendant le round en cours. Le chronomètre ne démarre **qu'une fois l'image affichée** (indispensable en mode Rapidité, sinon le joueur est pénalisé par sa connexion). 2 rounds d'avance, dès l'accueil ; signal `onvisible` après décodage et peinture de la photo.
- [x] Navigation : accueil → choix du mode (**Rapidité présélectionné**) → partie → résultats → rejouer en un clic.
  - ✅ **Décidé : routage par hash** (`#/rapidite`, `#/distance`). Testé derrière un serveur qui imite GitHub Pages : Précédent ramène à l'accueil (sans URL, il fait quitter le jeu), rechargement et lien partagé fonctionnent (avec la History API : page 404). Un lien direct vers un mode ouvre l'accueil avec ce mode présélectionné.
- [x] Persistance locale (`localStorage`, avec numéro de version du format) : meilleurs scores par mode, nombre de parties, historique des photos vues. Lecture tolérante, migrations, aucun plantage sans `localStorage`.

**Livrable :** squelette navigable, avec un mode factice jouable de bout en bout. ✅ Mode « Démonstration » (`#/factice`, choisir le bon site parmi 4) ; Rapidité et Distance branchés avec un écran provisoire « en construction ».

---

## Phase 5 — Mode Rapidité (par défaut)

**Objectif :** le mode principal, nerveux et satisfaisant à jouer.

### 5.1 Saisie et autocomplétion
- [x] Recherche **insensible aux accents, à la casse, aux tirets et aux apostrophes** : `st laurent`, `saint-laurent` et `Saint Laurent` doivent tous fonctionner.
- [x] Recherche sur les noms et les alias, **par préfixe de n'importe quel mot** : `seine` doit trouver Nogent-sur-Seine.
- [x] Suggestion affichée dans le champ en texte fantôme, en plus d'une liste déroulante (3-5 suggestions).
- [x] Clavier :
  - `Tab` complète avec la première suggestion ;
  - `↑` / `↓` parcourent la liste ;
  - `Entrée` valide.
  - `Échap` ferme la liste, puis vide le champ.
  - ✅ **Décidé : `Tab` complète seulement.** Avec 1 ou 2 lettres, la première suggestion est fausse 1 fois sur 2 ou sur 9 (test sur les 149 débuts de noms) : un `Tab` qui valide coûterait 2 s bien plus souvent qu'il ne fait gagner un appui. `Entrée` valide directement la suggestion en surbrillance (« Tric » + `Entrée`), donc un seul appui suffit déjà (voir [`docs/DECISIONS.md`](docs/DECISIONS.md#51-tab-complète-ou-valide)).
- [x] **Mobile** (pas de touche `Tab`) : on touche une suggestion pour valider directement. Il faut vérifier que le clavier virtuel ne masque ni la photo ni la barre de temps. Vérifié à 360 × 400 : photo, chrono, barre, 3 suggestions et champ visibles sans défilement.
- [x] Une proposition qui ne correspond à aucun site connu n'est pas une erreur : elle est simplement ignorée, ou on propose la suggestion la plus proche. ✅ Les deux : jamais de pénalité ; si rien ne commence par la saisie, la liste propose les sites à une ou deux fautes de frappe près (« tricastn » → Tricastin), sinon un message « rien n'est compté ».

### 5.2 Retours visuels
- [x] **Mauvaise réponse** : le champ **vibre** (animation de secousse courte, ~300 ms), le champ est vidé (✅ décidé : vidé), et la pénalité de **−2 s** s'applique. Sur mobile, ajouter une vibration de l'appareil (`navigator.vibrate`) si elle est disponible.
- [x] Les noms déjà tentés pendant le round sont affichés barrés, pour éviter de les retenter.
- [x] **Bonne réponse** : validation nette et rapide, avec le temps et le score du round.
- [x] **Temps écoulé** : la bonne réponse s'affiche.
- [x] Respecter `prefers-reduced-motion` : remplacer la secousse par un simple changement de couleur ou de contour.

### 5.3 Barre de temps
- [x] 20 s, animée de façon fluide (`requestAnimationFrame` ou transition CSS), avec un temps mesuré par `performance.now()` et non par le décompte d'un `setInterval`.
- [x] Tension croissante dans les dernières secondes (couleur, rythme, éventuellement son).
  - ✅ **Décidé : aucun son en v1.** On joue en cours ou en pause ; la tension passe par la barre et le chrono en rouge sous 5 s (`RAPIDITE_SEUIL_ALERTE_MS`) et le chrono qui marque chaque seconde. Un interrupteur désactivé par défaut prendrait de la place sur mobile pour un usage rare.
- [x] Visualisation du retrait de 2 s en cas d'erreur (saut de la barre, et « −2 s » affiché brièvement).
- [x] Pause automatique si l'onglet passe en arrière-plan ?
  - ✅ **Décidé : non, le temps continue de s'écouler.** La pause rendrait gratuite une recherche de la photo dans un autre onglet ; perdre le round sanctionnerait un simple Alt-Tab. Le chrono se fie à `performance.now()`, qui continue en arrière-plan (mesuré : chrono exact au retour) ; pause et round perdu restent réglables (`RAPIDITE_ARRIERE_PLAN`).

### 5.4 Fin de partie
- [x] Score total sur 8 rounds, temps moyen, nombre d'erreurs, meilleur score personnel.
- [x] Récapitulatif : chaque photo avec son nom et le temps mis.
- [x] Bouton « Rejouer » mis en avant (`Entrée` pour relancer).

**Livrable :** le mode Rapidité jouable en local, sur ordinateur et sur mobile. ✅ Partie complète vérifiée dans Edge à 1280 × 800, 360 × 740 et 360 × 400 (captures `docs/captures/phase5-*.png`).

---

## Phase 6 — Mode Distance

**Objectif :** placer la centrale sur une carte de France.

### 6.1 Carte
- [x] Choix technique :
  - **Option A** : **carte vectorielle sur mesure** (SVG ou Canvas, projection avec `d3-geo`, zoom avec `d3-zoom`). Style entièrement maîtrisé et cohérent avec la direction artistique, aucune dépendance à un serveur de tuiles, fonctionne hors ligne.
  - **Option B** : **Leaflet / MapLibre** avec des tuiles sombres (ex. CARTO Dark Matter). Plus rapide à mettre en place, mais l'aspect est plus générique et il faut respecter les conditions d'utilisation des fournisseurs de tuiles.
  - ✅ **Décidé : option A, carte sur mesure en SVG** (d3-geo, projection conique conforme de Lambert, d3-zoom, zoom ×1 à ×24). Zoom et déplacement à 60 images/s à 360 px avec un processeur ralenti 4 fois ; module carte chargé à la demande, 66 Ko gzip (voir [`docs/DECISIONS.md`](docs/DECISIONS.md#61-technique-de-carte)).
- [x] Données géographiques libres : Natural Earth 1:10m (domaine public), script reproductible `scripts/geo/construire-carte.mjs` (voir [`docs/CARTE.md`](docs/CARTE.md)) :
  - contours de la France métropolitaine (Natural Earth ou IGN Admin Express, simplifiés avec mapshaper) ;
  - **principaux fleuves** (Loire, Rhône, Seine, Garonne, Meuse, Moselle, Vienne, Gironde), issus de Natural Earth ou de la BD TOPO IGN.
  - ✅ **Décidé : oui, les 8 grands fleuves toujours, les affluents à partir du zoom ×3.** Savoir seulement « sur la Loire » ne rapporte que +100 à +280 points par round grâce aux fleuves affichés, aucun site n'est déductible du seul fleuve.
  - ✅ **Décidé : pas de limites administratives ; 8 grandes villes, et 20 autres à partir du zoom ×2,5.** Les limites chargent la carte (confusion avec les fleuves) ; aucune ville repère n'est à moins de 28 km d'une centrale.
- [x] **Ne jamais afficher la position des centrales avant la réponse.**

### 6.2 Interaction
- [x] Un clic ou un tap pose un marqueur, qu'on peut déplacer ou reposer, puis un bouton (ou `Entrée`) valide.
- [x] **Zoom et déplacement de la carte, comme sur GeoGuessr** ✅ *Décidé* :
  - zoom à la molette et avec des boutons `+` / `−` sur ordinateur, par pincement sur mobile ;
  - déplacement de la carte par glisser ;
  - zoom suffisant pour viser à quelques km près (à l'échelle d'un département) ;
  - indispensable sur mobile : la France y fait environ 350 px de large et un doigt couvre environ 40 px, soit plus de 100 km.
- [x] Le choix de la technique de carte (6.1) doit garantir un zoom fluide, avec un niveau de détail adapté : les fleuves secondaires et les villes n'apparaissent qu'en zoomant.
- [x] Afficher la photo et la carte côte à côte sur ordinateur. Sur mobile, prévoir une bascule photo / carte, ou une photo réductible.
  - ✅ **Décidé : photo réduite en haut, carte en dessous, photo agrandissable par-dessus la carte.** La photo reste visible pendant qu'on vise, 3 à 5 gestes par round (contre 5 à 7 avec une bascule), tout tient à 360 × 560.

### 6.3 Résultat d'un round
- [x] Afficher la vraie position, un **trait entre la proposition et la réponse**, la distance en km et le score.
- [x] Courte fiche du site : nom, réacteurs, source froide.
- [x] Animation sobre : la caméra zoome pour cadrer les deux points (instantané si `prefers-reduced-motion`).

### 6.4 Fin de partie
- [x] Score total sur 5 rounds, distance moyenne, meilleur score personnel.
- [x] Carte récapitulative avec les 5 propositions et les 5 réponses.

**Livrable :** le mode Distance jouable en local, sur ordinateur et sur mobile.

---

## Phase 7 — Mise en ligne

- [ ] Choisir l'hébergeur :
  - **GitHub Pages** : intégré au dépôt [RunAdam/NucGuessr](https://github.com/RunAdam/NucGuessr) ;
  - **Cloudflare Pages** : aperçu de chaque PR, CDN plus rapide.
  - ⚠️ **À trancher** : GitHub Pages par défaut.
- [ ] Workflow GitHub Actions : lint, tests, validation des données, build, puis déploiement à chaque push sur `main`.
- [ ] Régler `base: '/NucGuessr/'` dans Vite si le site est hébergé sur GitHub Pages sans domaine personnalisé.
- [ ] Page « À propos » : crédits des photos, licences (photos, polices, données géographiques), mention « projet étudiant non affilié à EDF / Orano / CEA / ASNR ».
- [ ] Choisir la licence du code.
  - ⚠️ **À trancher** : MIT par défaut. Les photos gardent leur propre licence.
- [ ] Ajouter une image d'aperçu (Open Graph) pour que le lien s'affiche joliment quand on le partage dans le groupe de la promo.

**Livrable :** le jeu en ligne et le lien envoyé à la promo.

---

## Phase 8 — Finitions et retours de la promo

- [ ] Recueillir les retours : barèmes, durée des rounds, photos trop faciles ou trop dures, bugs.
- [ ] Ajuster les paramètres (pénalité, `k` du mode Distance, durée) à partir de ces retours.
- [ ] Accessibilité : navigation entièrement au clavier, contraste, `prefers-reduced-motion`, lecteurs d'écran pour les menus.
- [ ] Performance : bon score Lighthouse sur mobile, poids total de la page (hors photos) < 200 Ko.
- [ ] Bouton « Partager mon score », qui copie un texte court avec le mode, le score et le lien.
- [ ] PWA (installable, hors ligne).
  - ⚠️ **À trancher**.

---

## Phase 9 — Plus tard

À reconsidérer une fois la v1 adoptée par la promo.

- [ ] **Parties partagées par lien** (`?seed=…`) : les mêmes photos pour tous ceux qui ouvrent le lien, pour se comparer équitablement sans serveur.
- [ ] **Défi quotidien** : une partie fixe par jour, choisie à partir de la date, à l'heure de Paris, avec un fichier de planning ou un tirage déterministe.
- [ ] **Classement en ligne** : Supabase ou Firebase en offre gratuite, avec un pseudo et un minimum de données (RGPD).
  - ⚠️ **À trancher** le moment venu.
- [ ] **Autres sites nucléaires** :
  - cycle du combustible : La Hague, Melox, Tricastin (Georges Besse II), Malvési, Romans ;
  - recherche : Saclay, Cadarache (ITER), Marcoule, ILL ;
  - arrêtés ou en démantèlement : Fessenheim, Superphénix, Brennilis, Chooz A ;
  - stockage : CSA, Cires, Cigéo/Bure.
  - ⚠️ **À trancher** : les mélanger aux centrales, ou proposer un filtre « Centrales / Tous sites ».
- [ ] **Autres modes** : vue satellite uniquement (orthophotos IGN), mode « palier » (deviner CP0 / CP1 / P4 / N4…), mode « date ».
- [ ] **Contributions de photos** par la promo, via un formulaire ou un template d'issue GitHub, avec validation manuelle.

---

## Annexe — Récapitulatif des décisions à trancher

| # | Phase | Décision | Piste par défaut |
|---|---|---|---|
| 1 | 0 | Anti-répétition des photos entre parties | ✅ **Décidé : rotation par site** (photo du site vue il y a le plus longtemps) |
| 2 | 0 | Pénalité d'erreur en mode Rapidité | ✅ **Décidé : −2 s** |
| 3 | 0 | Barème du mode Rapidité | ✅ **Décidé : `100 + 900 × t/20`** |
| 4 | 0 | Délai entre deux rounds en mode Rapidité | ✅ **Décidé : 1,5 s (3 s si perdu), qu'on peut passer** |
| 5 | 0 | Limite de temps du mode Distance | ✅ **Décidé : aucune** |
| 6 | 0 | Barème du mode Distance | ✅ **Décidé : `5000 × exp(−(d−5)/k)`, k = 75 km** |
| 7 | 0 | Bonus de précision du mode Distance | ✅ **Décidé : non, mais 5000 points à moins de 5 km** |
| 8 | 1 | Convention de date de mise en service | ✅ **Décidé : année du couplage au réseau, par réacteur** |
| 9 | 1 | JSON ou YAML | ✅ **Décidé : JSON** (+ JSON Schema) |
| 10 | 2 | Difficulté par photo | ✅ **Décidé : oui, 1 à 3, manuelle ; Rapidité sans les difficiles (≤ 2), Distance toutes** |
| 11 | 2 | Version basse résolution pour le chargement | ✅ **Décidé : non en v1 ; préchargement 2 rounds d'avance, 300 Ko max** |
| 12 | 3 | Métaphores visuelles (barres de contrôle, décroissance…) | ✅ **Décidé : légères** (barre linéaire graduée à la seconde, pas d'exponentielle ; score en relevé ; fin en compte rendu d'essai) |
| 13 | 3 | Maquettes Figma ou HTML | ✅ **Décidé : prototypes HTML autonomes** |
| 14 | 3 | Typographies | ✅ **Décidé : IBM Plex Sans + IBM Plex Mono** (77 Ko) |
| 15 | 4 | Framework UI | ✅ **Décidé : Svelte 5** (Vite 8, TypeScript strict) |
| 16 | 4 | Tailwind ou bibliothèque de composants | ✅ **Décidé : non, CSS natif + tokens** |
| 17 | 4 | Routage | ✅ **Décidé : par hash** (`#/`, `#/rapidite`, `#/distance`) |
| 18 | 5 | `Tab` complète ou valide | ✅ **Décidé : complète seulement** (`Entrée` valide la suggestion en surbrillance) |
| 19 | 5 | Son | ✅ **Décidé : aucun son en v1** |
| 20 | 5 | Onglet en arrière-plan pendant un round | ✅ **Décidé : le temps continue de s'écouler** |
| 21 | 6 | Carte sur mesure ou tuiles (zoom obligatoire ✅) | ✅ **Décidé : sur mesure, SVG (d3-geo + d3-zoom)**, 60 images/s sur mobile lent simulé |
| 22 | 6 | Affichage des fleuves | ✅ **Décidé : oui, grands fleuves toujours, affluents à partir du zoom ×3** |
| 23 | 6 | Repères (régions, villes) | ✅ **Décidé : 8 grandes villes (+20 en zoomant), pas de limites administratives** |
| 24 | 6 | Mise en page photo/carte sur mobile | ✅ **Décidé : photo réduite en haut (agrandissable), carte en dessous** |
| 25 | 7 | Hébergeur | GitHub Pages |
| 26 | 7 | Licence du code | MIT |
| 27 | 8 | PWA | Plus tard |
| 28 | 9 | Mélange des centrales et des autres sites | Filtre séparé |
