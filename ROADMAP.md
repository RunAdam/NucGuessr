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
- [ ] Périmètre v1 : **les 18 centrales en exploitation** (Flamanville 3 est rattachée au site de Flamanville).
- [ ] Tirage des photos : aléatoire, **sans répéter un site dans une même partie** (8 rounds sur 18 sites, c'est possible).
- [ ] Éviter de revoir trop souvent les mêmes photos d'une partie à l'autre : mémoriser en local les dernières photos vues et les tirer moins souvent.
  - ⚠️ **À trancher** : simple exclusion des N dernières photos, ou tirage pondéré.
- [ ] Écran de fin de partie : score total, récapitulatif round par round (photo, réponse, temps ou distance), fiche courte de chaque site.

### Mode Rapidité
- [ ] 8 rounds, 20 s par round. Au-delà, le round est perdu et la réponse s'affiche.
- [ ] Réponses fausses illimitées, mais **chaque mauvaise réponse retire 2 s** du temps restant, et la barre fait un saut visible. ✅ *Décidé.* Sans cette pénalité, l'autocomplétion permettrait d'essayer les 18 noms à la suite en moins de 20 s.
- [ ] Barème de score.
  - ⚠️ **À trancher** : par exemple `score = 1000 × temps_restant / 20`, avec un plancher pour une bonne réponse tardive. À ajuster en jouant.
- [ ] Faut-il un délai entre deux rounds (afficher la réponse 1,5 s), ou enchaîner directement ?
  - ⚠️ **À trancher**. Un court délai, avec possibilité de passer en appuyant sur `Entrée`, semble un bon compromis.

### Mode Distance
- [ ] 5 rounds, un seul clic validé par round.
- [ ] Limite de temps.
  - ⚠️ **À trancher** : aucune, ou 2-3 min par round, uniquement pour éviter les parties qui traînent.
- [ ] Barème de score.
  - ⚠️ **À trancher** : décroissance exponentielle façon GeoGuessr, `score = 5000 × exp(−d / k)`, maximum 25 000 par partie. Il faut un `k` adapté à l'échelle de la France (environ 50 à 150 km), à calibrer pour qu'une erreur de « bon fleuve, mauvais site » coûte cher sans être nulle.
- [ ] Faut-il donner un bonus pour une précision parfaite (< 5 km) ?
  - ⚠️ **À trancher**.

**Livrable :** une section « Règles du jeu » dans le `README.md`.

---

## Phase 1 — Données des sites

**Objectif :** une source de vérité unique décrivant chaque site.

- [ ] Créer `data/sites.json`, avec pour chaque site :
  - `id` (slug stable, ex. `nogent`) ;
  - `nom_complet` (« Centrale nucléaire de Nogent-sur-Seine »), `nom_court` (« Nogent-sur-Seine ») ;
  - `alias` acceptés par l'autocomplétion (« Nogent », « St-Laurent », « Saint-Laurent-des-Eaux ») ;
  - `lat`, `lon` (**position précise de l'îlot nucléaire**, indispensable pour le mode Distance), `commune`, `departement`, `region` ;
  - `exploitant`, `type_site` (centrale pour la v1, prévu pour les autres types de sites plus tard) ;
  - `reacteurs` : nombre, palier(s) (CP0, CP1, CP2, P4, P'4, N4, EPR), puissance ;
  - `source_froide` : nom et type (fleuve / mer / estuaire) ;
  - `mise_en_service`, `statut` ;
  - `anecdote` : 2 ou 3 phrases historiques ou techniques, affichées en fin de partie.
- [ ] Sources : Wikipédia, rapports de l'ASNR, pages EDF, cours. **Vérifier chaque valeur**, coordonnées comprises (contrôle sur les orthophotos IGN).
  - ⚠️ **À trancher** : la convention de date (divergence, couplage ou mise en service commerciale).
- [ ] Définir un schéma (type TypeScript ou JSON Schema) et le valider en CI.
  - ⚠️ **À trancher** : JSON ou YAML.
- [ ] Faire relire les données par 1 ou 2 camarades.

**Livrable :** `data/sites.json` complet pour les 18 centrales.

---

## Phase 2 — Photos

**Objectif :** une banque d'images libres de droits, qui ne trahissent pas la réponse.

### 2.1 Sourcing et droits
- [ ] Sources autorisées :
  - **Wikimedia Commons** (CC0, CC BY, CC BY-SA) : afficher l'auteur et la licence, avec un lien vers l'original ;
  - **Orthophotos IGN / Géoplateforme** (licence ouverte Etalab 2.0) ;
  - **photos personnelles** de la promo, avec l'accord explicite de leurs auteurs.
- [ ] Sources **interdites** : Google Images, photos de presse EDF, Orano ou CEA sans autorisation, captures Google Maps/Earth.
- [ ] Créer `data/photos.json` : `id` opaque, `site_id`, `type` (sol / aérienne / satellite / détail), `auteur`, `licence`, `url_source`, `difficulte`.
  - ⚠️ **À trancher** : faut-il une difficulté par photo ? Elle pourrait servir à réserver les photos faciles (vues d'ensemble) au mode Rapidité, où l'on n'a que 20 s.

### 2.2 Anti-triche involontaire
- [ ] Noms de fichiers opaques (hash).
- [ ] **Suppression de toutes les métadonnées EXIF**, GPS compris.
- [ ] Recadrer ou flouter les panneaux, logos et noms visibles.
- [ ] Aucun nom de site dans le texte `alt` pendant le round.

### 2.3 Traitement automatique
- [ ] Script `scripts/process_photos.py` (Pillow) qui prend `photos_sources/` (ignoré par git) et :
  - redimensionne à 1600 px de large au maximum ;
  - convertit en WebP (~150-300 Ko) ;
  - supprime les EXIF et renomme avec un hash ;
  - écrit dans `public/photos/` et met à jour `data/photos.json`.
- ⚠️ **À trancher** : faut-il en plus une version basse résolution (~400 px, floutée) pour l'affichage pendant le chargement ?

### 2.4 Volume
- [ ] Objectif v1 : **3 à 5 photos par site**, soit 55 à 90 photos. En jeu libre, il n'y a pas de calendrier à remplir, mais plus la banque est grande, moins on reconnaît la photo plutôt que le site.
- [ ] Varier les angles pour chaque site : vue lointaine, aérienne, détail.

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
  - ⚠️ **À trancher** après prototypage : une métaphore trop poussée peut nuire à la lisibilité.

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
- [ ] Constituer un moodboard (captures de salles de commande, schémas, typographies, photos de piscines de réacteur).
- [ ] Produire **2 ou 3 directions** sous forme de maquettes rapides de l'écran de jeu du mode Rapidité (le plus contraint), puis en choisir une avec la promo.
  - ⚠️ **À trancher** : maquettes dessinées dans Figma (gratuit), ou prototypes HTML directement.
- [ ] Choisir la typographie : une police pour les titres et le texte, et une police à chasse fixe pour les chiffres (temps, score, distances).
  - Toutes les polices doivent être sous licence libre (OFL) et auto-hébergées, sans dépendre de Google Fonts.
  - ⚠️ **À trancher** : pistes à tester, comme IBM Plex (Sans + Mono, esprit industriel), JetBrains Mono, Space Mono, ou une police d'affichage plus marquée pour le titre.
- [ ] Définir une palette restreinte : fond quasi noir légèrement teinté, 2-3 gris, **un seul accent** (bleu Tcherenkov), et des couleurs de statut sobres (succès, erreur).
  - Les couleurs ne doivent pas être le seul indicateur (pensez aux daltoniens).
  - Contraste conforme WCAG AA.
- [ ] Concevoir l'identité : logo ou wordmark « NucGuessr » et favicon.
- [ ] Traduire tout cela en **design tokens** (variables CSS : couleurs, espacements, rayons, durées d'animation), utilisés partout dans le code.
- [ ] Style de la carte du mode Distance, en cohérence avec le reste du design (voir phase 6).

**Livrable :** maquettes validées, tokens CSS, polices et logo.

---

## Phase 4 — Socle technique

**Objectif :** la structure commune aux deux modes.

### 4.1 Stack
- [ ] **Vite + TypeScript**.
  - ⚠️ **À trancher** : TypeScript sans framework, ou un framework léger (**Svelte** ou **Preact**). Avec deux modes, plusieurs écrans (accueil, jeu, résultats) et une interface animée, un framework léger devient intéressant. Svelte est un bon compromis (peu de code, animations intégrées).
- [ ] CSS : du CSS natif avec les tokens de la phase 3.
  - ⚠️ **À trancher** : éviter Tailwind et les bibliothèques de composants toutes faites, qui poussent vers le look générique ?
- [ ] ESLint + Prettier, et **Vitest** pour la logique pure (tirage, scores, normalisation des noms, distance).

### 4.2 Architecture
- [ ] Moteur de partie générique : liste de rounds, round courant, score, état (en cours / terminé), utilisé par les deux modes.
- [ ] Module de tirage : choix aléatoire sans répéter un site dans la partie, avec historique local (voir phase 0).
- [ ] **Préchargement des photos** : charger la photo du round suivant pendant le round en cours. Le chronomètre ne démarre **qu'une fois l'image affichée** (indispensable en mode Rapidité, sinon le joueur est pénalisé par sa connexion).
- [ ] Navigation : accueil → choix du mode (**Rapidité présélectionné**) → partie → résultats → rejouer en un clic.
  - ⚠️ **À trancher** : routage par hash (`#/rapidite`, `#/distance`, compatible GitHub Pages) ou état interne sans URL.
- [ ] Persistance locale (`localStorage`, avec numéro de version du format) : meilleurs scores par mode, nombre de parties, historique des photos vues.

**Livrable :** squelette navigable, avec un mode factice jouable de bout en bout.

---

## Phase 5 — Mode Rapidité (par défaut)

**Objectif :** le mode principal, nerveux et satisfaisant à jouer.

### 5.1 Saisie et autocomplétion
- [ ] Recherche **insensible aux accents, à la casse, aux tirets et aux apostrophes** : `st laurent`, `saint-laurent` et `Saint Laurent` doivent tous fonctionner.
- [ ] Recherche sur les noms et les alias, **par préfixe de n'importe quel mot** : `seine` doit trouver Nogent-sur-Seine.
- [ ] Suggestion affichée dans le champ en texte fantôme, en plus d'une liste déroulante (3-5 suggestions).
- [ ] Clavier :
  - `Tab` complète avec la première suggestion ;
  - `↑` / `↓` parcourent la liste ;
  - `Entrée` valide.
  - ⚠️ **À trancher** : `Tab` valide-t-il directement, ou complète-t-il seulement (deux appuis au total) ? La seconde option évite les validations accidentelles.
- [ ] **Mobile** (pas de touche `Tab`) : on touche une suggestion pour valider directement. Il faut vérifier que le clavier virtuel ne masque ni la photo ni la barre de temps.
- [ ] Une proposition qui ne correspond à aucun site connu n'est pas une erreur : elle est simplement ignorée, ou on propose la suggestion la plus proche.

### 5.2 Retours visuels
- [ ] **Mauvaise réponse** : le champ **vibre** (animation de secousse courte, ~300 ms), le champ est vidé ou le texte sélectionné, et la pénalité de **−2 s** s'applique. Sur mobile, ajouter une vibration de l'appareil (`navigator.vibrate`) si elle est disponible.
- [ ] Les noms déjà tentés pendant le round sont affichés barrés, pour éviter de les retenter.
- [ ] **Bonne réponse** : validation nette et rapide, avec le temps et le score du round.
- [ ] **Temps écoulé** : la bonne réponse s'affiche.
- [ ] Respecter `prefers-reduced-motion` : remplacer la secousse par un simple changement de couleur ou de contour.

### 5.3 Barre de temps
- [ ] 20 s, animée de façon fluide (`requestAnimationFrame` ou transition CSS), avec un temps mesuré par `performance.now()` et non par le décompte d'un `setInterval`.
- [ ] Tension croissante dans les dernières secondes (couleur, rythme, éventuellement son).
  - ⚠️ **À trancher** : faut-il du son ? Ce serait désactivé par défaut, puisqu'on joue en cours ou en pause.
- [ ] Visualisation du retrait de 2 s en cas d'erreur (saut de la barre, et « −2 s » affiché brièvement).
- [ ] Pause automatique si l'onglet passe en arrière-plan ?
  - ⚠️ **À trancher** : c'est plus juste pour le joueur, mais ça ouvre la porte à la triche (pause, recherche, retour). On peut aussi simplement perdre le round.

### 5.4 Fin de partie
- [ ] Score total sur 8 rounds, temps moyen, nombre d'erreurs, meilleur score personnel.
- [ ] Récapitulatif : chaque photo avec son nom et le temps mis.
- [ ] Bouton « Rejouer » mis en avant (`Entrée` pour relancer).

**Livrable :** le mode Rapidité jouable en local, sur ordinateur et sur mobile.

---

## Phase 6 — Mode Distance

**Objectif :** placer la centrale sur une carte de France.

### 6.1 Carte
- [ ] Choix technique :
  - **Option A** : **carte vectorielle sur mesure** (SVG ou Canvas, projection avec `d3-geo`, zoom avec `d3-zoom`). Style entièrement maîtrisé et cohérent avec la direction artistique, aucune dépendance à un serveur de tuiles, fonctionne hors ligne.
  - **Option B** : **Leaflet / MapLibre** avec des tuiles sombres (ex. CARTO Dark Matter). Plus rapide à mettre en place, mais l'aspect est plus générique et il faut respecter les conditions d'utilisation des fournisseurs de tuiles.
  - ⚠️ **À trancher** : l'option A est recommandée pour l'identité visuelle, à condition que le zoom (obligatoire, voir 6.2) reste fluide sur mobile. Sinon, il faut se rabattre sur l'option B.
- [ ] Données géographiques libres :
  - contours de la France métropolitaine (Natural Earth ou IGN Admin Express, simplifiés avec mapshaper) ;
  - **principaux fleuves** (Loire, Rhône, Seine, Garonne, Meuse, Moselle, Vienne, Gironde), issus de Natural Earth ou de la BD TOPO IGN.
  - ⚠️ **À trancher** : faut-il afficher les fleuves ? Ce sont des repères géographiques et non des réponses, et un physicien sait qu'une centrale a besoin d'une source froide. Mais ils rendent le jeu nettement plus facile. On pourrait aussi les afficher seulement à partir d'un certain zoom.
  - ⚠️ **À trancher** : afficher les limites des régions ou départements, et quelques grandes villes comme repères ?
- [ ] **Ne jamais afficher la position des centrales avant la réponse.**

### 6.2 Interaction
- [ ] Un clic ou un tap pose un marqueur, qu'on peut déplacer ou reposer, puis un bouton (ou `Entrée`) valide.
- [ ] **Zoom et déplacement de la carte, comme sur GeoGuessr** ✅ *Décidé* :
  - zoom à la molette et avec des boutons `+` / `−` sur ordinateur, par pincement sur mobile ;
  - déplacement de la carte par glisser ;
  - zoom suffisant pour viser à quelques km près (à l'échelle d'un département) ;
  - indispensable sur mobile : la France y fait environ 350 px de large et un doigt couvre environ 40 px, soit plus de 100 km.
- [ ] Le choix de la technique de carte (6.1) doit garantir un zoom fluide, avec un niveau de détail adapté : les fleuves secondaires et les villes n'apparaissent qu'en zoomant.
- [ ] Afficher la photo et la carte côte à côte sur ordinateur. Sur mobile, prévoir une bascule photo / carte, ou une photo réductible.
  - ⚠️ **À trancher** après prototypage.

### 6.3 Résultat d'un round
- [ ] Afficher la vraie position, un **trait entre la proposition et la réponse**, la distance en km et le score.
- [ ] Courte fiche du site : nom, réacteurs, source froide.
- [ ] Animation sobre : la caméra zoome pour cadrer les deux points.

### 6.4 Fin de partie
- [ ] Score total sur 5 rounds, distance moyenne, meilleur score personnel.
- [ ] Carte récapitulative avec les 5 propositions et les 5 réponses.

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
| 1 | 0 | Anti-répétition des photos entre parties | Exclure les N dernières vues |
| 2 | 0 | Pénalité d'erreur en mode Rapidité | ✅ **Décidé : −2 s** |
| 3 | 0 | Barème du mode Rapidité | Proportionnel au temps restant |
| 4 | 0 | Délai entre deux rounds en mode Rapidité | ~1,5 s, qu'on peut passer |
| 5 | 0 | Limite de temps du mode Distance | Aucune, ou 3 min |
| 6 | 0 | Barème du mode Distance | `5000 × exp(−d/k)`, k ≈ 50-150 km |
| 7 | 0 | Bonus de précision du mode Distance | Non |
| 8 | 1 | Convention de date de mise en service | Couplage au réseau |
| 9 | 1 | JSON ou YAML | JSON |
| 10 | 2 | Difficulté par photo | Oui, manuelle |
| 11 | 2 | Version basse résolution pour le chargement | Non en v1 |
| 12 | 3 | Métaphores visuelles (barres de contrôle, décroissance…) | À prototyper |
| 13 | 3 | Maquettes Figma ou HTML | Prototypes HTML |
| 14 | 3 | Typographies | IBM Plex Sans + Mono, à tester |
| 15 | 4 | Framework UI | Svelte |
| 16 | 4 | Tailwind ou bibliothèque de composants | Non, CSS natif + tokens |
| 17 | 4 | Routage | Par hash |
| 18 | 5 | `Tab` complète ou valide | Complète seulement |
| 19 | 5 | Son | Non, ou désactivé par défaut |
| 20 | 5 | Onglet en arrière-plan pendant un round | Le temps continue de s'écouler |
| 21 | 6 | Carte sur mesure ou tuiles (zoom obligatoire ✅) | Sur mesure (d3-geo), si le zoom est fluide |
| 22 | 6 | Affichage des fleuves | Oui, à tester |
| 23 | 6 | Repères (régions, villes) | Quelques villes, à tester |
| 24 | 6 | Mise en page photo/carte sur mobile | À prototyper |
| 25 | 7 | Hébergeur | GitHub Pages |
| 26 | 7 | Licence du code | MIT |
| 27 | 8 | PWA | Plus tard |
| 28 | 9 | Mélange des centrales et des autres sites | Filtre séparé |
