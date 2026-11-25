# NucGuessr — Feuille de route

> Reconnaître un site nucléaire français à partir d'une photo, avec un défi quotidien, dans l'esprit de Pedantix, TimeGuessr, Worldle, etc.

**Contraintes :**
- jouable dans un navigateur, simple d'utilisation, parties courtes ;
- **hébergement gratuit** (public restreint : une promo) ;
- maintenance minimale.

**Idée directrice :** un **site 100 % statique**. Le défi du jour se calcule côté navigateur à partir de la date, et les scores sont stockés localement. Pas de serveur ni de base de données, au moins jusqu'à la phase 4.

**Légende :**
- `[ ]` tâche à faire
- ⚠️ **À trancher** : choix technique incertain, à décider en début d'étape

---

## Sommaire

0. [Phase 0 — Cadrage](#phase-0--cadrage)
1. [Phase 1 — Données des sites](#phase-1--données-des-sites)
2. [Phase 2 — Photos](#phase-2--photos)
3. [Phase 3 — MVP jouable](#phase-3--mvp-jouable)
4. [Phase 4 — Défi quotidien et partage](#phase-4--défi-quotidien-et-partage)
5. [Phase 5 — Mise en ligne](#phase-5--mise-en-ligne)
6. [Phase 6 — Finitions et retours de la promo](#phase-6--finitions-et-retours-de-la-promo)
7. [Phase 7 — Classement (optionnel)](#phase-7--classement-optionnel)
8. [Phase 8 — Extensions](#phase-8--extensions)
9. [Annexe — Décisions à trancher](#annexe--récapitulatif-des-décisions-à-trancher)

---

## Phase 0 — Cadrage

**Objectif :** figer les règles du jeu avant d'écrire du code.

- [ ] Définir le périmètre de la v1 : **les 18 centrales en exploitation**. Flamanville 3 (EPR) est rattachée au site de Flamanville.
- [ ] Définir la mécanique de jeu.
  - Proposition : **6 essais**, saisie d'un nom avec autocomplétion. Après chaque essai faux, le joueur voit :
    - la **distance et la direction** vers la bonne réponse (façon Worldle) ;
    - une **comparaison d'attributs** (façon jeux en -dle) : même palier ? même source froide ? plus ou moins de réacteurs ? mise en service avant ou après ?
  - ⚠️ **À trancher** : garder les deux types d'indices ou un seul ? Les deux ensemble rendent peut-être le jeu trop facile avec seulement 18 réponses possibles.
  - ⚠️ **À trancher** : faut-il dézoomer l'image à chaque erreur ? Cela ajoute de la difficulté et du suspense, mais impose des photos de bonne résolution.
  - ⚠️ **À trancher** : 6 essais est-il le bon nombre ? Avec 18 réponses, 6 essais revient à un tiers des possibilités. On pourrait descendre à 4 ou 5.
- [ ] Définir le système de score : victoire/défaite et nombre d'essais, ou score en points façon TimeGuessr.
  - ⚠️ **À trancher**.
- [ ] Fixer l'heure de changement du défi : minuit, **heure de Paris** (`Europe/Paris`).
- [ ] Choisir la langue : français uniquement.

**Livrable :** une section « Règles du jeu » ajoutée au `README.md`.

---

## Phase 1 — Données des sites

**Objectif :** une source de vérité unique décrivant chaque site.

- [ ] Créer `data/sites.json`, avec pour chaque site :
  - `id` (slug stable, ex. `cattenom`), `nom`, alias acceptés à la saisie (ex. « Saint-Laurent », « St-Laurent-des-Eaux ») ;
  - `lat`, `lon`, `commune`, `departement`, `region` ;
  - `exploitant` ;
  - `reacteurs` : nombre, palier(s) (CP0, CP1, CP2, P4, P'4, N4, EPR), puissance unitaire et totale ;
  - `source_froide` : nom du fleuve ou de la mer, type (fleuve / mer / estuaire) ;
  - `aerorefrigerants` : oui ou non, et combien ;
  - `mise_en_service` : année de la première divergence ou du premier couplage ;
  - `statut` : en exploitation / à l'arrêt / en démantèlement (utile pour la phase 8) ;
  - `anecdote` : 2 ou 3 phrases historiques ou techniques, affichées après la partie.
- [ ] Sources : Wikipédia, rapports de l'ASNR, pages EDF des centrales, cours de la promo. **Vérifier chaque valeur.**
  - ⚠️ **À trancher** : pour la date, choisir une convention unique (divergence, couplage ou mise en service commerciale) et s'y tenir partout.
- [ ] Définir le **schéma** (type TypeScript ou JSON Schema) et le valider automatiquement en CI.
  - ⚠️ **À trancher** : JSON simple ou YAML (plus lisible pour les contributeurs, mais demande une conversion).
- [ ] Faire relire les données par 1 ou 2 camarades.

**Livrable :** `data/sites.json` complet pour les 18 centrales, avec un schéma validé.

---

## Phase 2 — Photos

**Objectif :** une banque d'images libres de droits, qui ne trahissent pas la réponse.

### 2.1 Sourcing et droits

- [ ] Sources autorisées :
  - **Wikimedia Commons** (CC0, CC BY, CC BY-SA) : il faut afficher l'auteur et la licence, et donner le lien vers l'original ;
  - **Orthophotos IGN / Géoplateforme** (licence ouverte Etalab 2.0) : pour un mode « vue aérienne » ;
  - **photos personnelles** des membres de la promo (stages, visites), avec leur accord explicite.
- [ ] Sources **interdites** : Google Images, photos de presse EDF, Orano ou CEA sans autorisation, captures Google Maps/Earth (conditions d'utilisation restrictives).
- [ ] Créer `data/photos.json` : `id` opaque, `site_id`, `type` (sol / aérienne / satellite / détail), `auteur`, `licence`, `url_source`, `difficulte` estimée.
- ⚠️ **À trancher** : niveau de difficulté attribué à la main, ou calculé plus tard à partir des statistiques de réussite (impossible sans backend, voir phase 7).

### 2.2 Anti-triche « involontaire »

- [ ] Renommer chaque fichier avec un identifiant opaque (hash), par exemple `a3f9c2e1.webp`.
- [ ] **Supprimer toutes les métadonnées EXIF**, GPS compris.
- [ ] Recadrer ou flouter les panneaux, logos et noms visibles.
- [ ] Ne jamais mettre le nom du site dans le texte alternatif (`alt`) avant la fin de la partie.

### 2.3 Traitement automatique

- [ ] Script `scripts/process_photos.py` (Pillow), qui prend `photos_sources/` (hors dépôt, ou dépôt privé) et :
  - redimensionne à 1600 px de large au maximum ;
  - convertit en WebP (qualité ~80, cible 150 à 300 Ko) ;
  - supprime les EXIF ;
  - renomme avec un hash ;
  - écrit dans `public/photos/` et met à jour `data/photos.json`.
- ⚠️ **À trancher** : faut-il garder les photos originales hors du dépôt public ? Probablement oui, car les noms de fichiers d'origine révèlent la réponse. Un dossier local ignoré par git ou un dépôt privé séparé feraient l'affaire.

### 2.4 Volume

- [ ] Objectif v1 : **au moins 5 photos par site**, soit environ 90 photos. Cela donne 3 mois de défis sans répétition.
- [ ] Objectif à 1 an : 10 à 20 photos par site, ou répétitions espacées acceptées.
- [ ] Varier les angles pour chaque site : vue lointaine, aérienne, détail (salle des machines, aéroréfrigérant, prise d'eau).

**Livrable :** environ 90 photos traitées, et `data/photos.json` avec les crédits complets.

---

## Phase 3 — MVP jouable

**Objectif :** une partie jouable en local, avec une photo aléatoire.

### 3.1 Stack

- [ ] **Vite + TypeScript**.
  - ⚠️ **À trancher** : TypeScript sans framework, ou un framework léger (**Svelte** ou **Preact**). Sans framework, il n'y a aucune dépendance, mais l'interface (historique des essais, modales, stats) devient vite verbeuse. Svelte est un bon compromis. À décider selon les préférences de qui code.
- [ ] Linter et formatage : ESLint + Prettier.
- [ ] Tests unitaires : **Vitest**, pour la logique pure (calcul de distance, choix du défi, comparaison d'attributs).

### 3.2 Fonctionnalités

- [ ] Afficher la photo (clic pour agrandir, zoom au pincement sur mobile).
- [ ] Champ de saisie avec **autocomplétion** sur les noms et alias, insensible aux accents et à la casse.
- [ ] Calcul de la distance (formule de Haversine) et de la direction (flèche à 8 directions).
- [ ] Tableau de comparaison des attributs (vert / orange / rouge, flèches ↑↓ pour les valeurs numériques).
- [ ] Fin de partie : nom du site, fiche (attributs et anecdote), **crédits de la photo**.
- [ ] Interface **mobile d'abord** : les parties se jouent pendant les pauses, sur téléphone.
- [ ] Carte des centrales après la partie (optionnelle).
  - ⚠️ **À trancher** : **Leaflet + OpenStreetMap** (simple, mais ajoute environ 40 Ko et des requêtes de tuiles) ou un **SVG statique de la France** (plus léger, sans dépendance externe, mais moins interactif). Le SVG suffit probablement.

**Livrable :** `npm run dev` lance une partie jouable de bout en bout.

---

## Phase 4 — Défi quotidien et partage

**Objectif :** le même défi pour tout le monde chaque jour, et un résultat facile à partager.

### 4.1 Défi du jour sans serveur

- [ ] Calculer le numéro du jour : `n = nombre de jours depuis la date de lancement` (en heure de Paris).
- [ ] Choisir la photo du jour :
  - **Option A** : `photo = hash(n) % nb_photos`. Simple, mais des répétitions rapprochées sont possibles, et ajouter des photos change le défi des jours futurs.
  - **Option B** : un fichier `data/schedule.json` généré par un script, qui liste la photo de chaque jour. Pas de répétition, contrôle éditorial possible (ex. Fessenheim le jour anniversaire de sa fermeture), et le passé est figé.
  - ⚠️ **À trancher** : l'option B est recommandée. Il faut juste penser à prolonger le planning de temps en temps, par exemple avec une alerte en CI quand il reste moins de 30 jours.
- [ ] Gérer le cas « plus de défi programmé » avec un message propre plutôt qu'un plantage.

### 4.2 Persistance locale

- [ ] `localStorage` : partie en cours (reprise après fermeture de l'onglet), historique, série de victoires, distribution du nombre d'essais.
- [ ] Mettre un numéro de version sur le format de stockage, pour pouvoir le migrer plus tard.

### 4.3 Partage

- [ ] Bouton **« Partager »** qui copie un résultat en emojis, sans spoiler, par exemple :
  ```
  NucGuessr #42 — 3/6
  🟥🟧🟩
  https://<pseudo>.github.io/NucGuessr
  ```
- [ ] Utiliser l'API `navigator.share` sur mobile, et le presse-papiers en repli.

### 4.4 Obfuscation légère

- [ ] Encoder les réponses dans le planning (base64 ou XOR) pour éviter qu'un simple coup d'œil au code source donne la réponse.
  - ⚠️ **À trancher** : à ce niveau, ça ne protège que des curieux. Une vraie protection demanderait un backend, ce qui n'en vaut pas la peine pour une promo.

**Livrable :** un défi numéroté par jour, des stats locales et un bouton de partage.

---

## Phase 5 — Mise en ligne

**Objectif :** une URL publique, gratuite, déployée automatiquement.

- [ ] Choisir l'hébergeur :
  - **GitHub Pages** : intégré au dépôt, URL `pseudo.github.io/NucGuessr`, limite de 1 Go par site ;
  - **Cloudflare Pages** : CDN plus rapide, aperçu automatique de chaque PR, domaine `*.pages.dev`.
  - ⚠️ **À trancher** : GitHub Pages est le plus simple pour commencer. Cloudflare Pages est utile si on veut des aperçus de PR ou plus de performance.
- [ ] Workflow GitHub Actions : lint, tests, validation des données, build et déploiement à chaque push sur `main`.
- [ ] Régler le `base` de Vite (`/NucGuessr/`) si le site est hébergé sur GitHub Pages sans domaine personnalisé.
- [ ] Nom de domaine personnalisé (optionnel, environ 10 €/an, donc pas gratuit).
  - ⚠️ **À trancher**.
- [ ] Ajouter une page « À propos » : crédits des photos, licences, mention « projet étudiant non affilié à EDF / Orano / CEA ».
- [ ] Choisir la licence du dépôt (MIT pour le code ; les photos gardent chacune leur licence d'origine).
  - ⚠️ **À trancher**.

**Livrable :** le jeu en ligne et le lien envoyé à la promo.

---

## Phase 6 — Finitions et retours de la promo

- [ ] Recueillir les retours (difficulté, bugs, photos trop faciles ou trop dures).
- [ ] Mode sombre.
- [ ] Animations légères (révélation des indices, confettis en cas de victoire).
- [ ] Accessibilité : contraste suffisant, navigation au clavier, couleurs des indices doublées de symboles (pour les daltoniens).
- [ ] PWA (installable sur téléphone, fonctionne hors ligne).
  - ⚠️ **À trancher** : utile pour l'effet « application », mais le cache doit être bien géré pour ne pas servir un ancien planning.
- [ ] **Mode entraînement** (photos aléatoires illimitées, hors défi du jour).
- [ ] Archives : rejouer les défis des jours passés.

---

## Phase 7 — Classement (optionnel)

**À ne lancer que si le partage d'emojis dans le groupe ne suffit plus.**

- [ ] Options :
  - **Supabase** (Postgres + authentification, offre gratuite) ;
  - **Firebase / Firestore** (offre gratuite) ;
  - **Google Sheet + Apps Script** (le plus simple, mais fragile).
  - ⚠️ **À trancher** : le choix dépend des besoins (simple classement du jour ou statistiques détaillées). Supabase est le plus propre.
- [ ] Identification : pseudo seul, ou lien magique par e-mail.
  - ⚠️ **À trancher** : sans vraie authentification, n'importe qui peut envoyer de faux scores. C'est acceptable entre amis.
- [ ] Classement du jour, de la semaine, et série de victoires.
- [ ] Statistiques globales (% de réussite par photo), qui permettraient de calibrer la difficulté (voir phase 2.1).
- [ ] RGPD : collecter un minimum de données (un pseudo, pas d'e-mail si possible) et l'indiquer dans la page « À propos ».

---

## Phase 8 — Extensions

- [ ] **Autres sites nucléaires** (attributs adaptés : `type_site` = centrale / cycle du combustible / recherche / démantèlement / stockage) :
  - cycle du combustible : La Hague, Melox, Tricastin (Georges Besse II), Malvési, Romans ;
  - recherche : Saclay, Cadarache (dont ITER), Marcoule, Grenoble (ILL) ;
  - arrêtés ou en démantèlement : Fessenheim, Superphénix (Creys-Malville), Brennilis, Chooz A, Bugey 1, Saint-Laurent A, Chinon A ;
  - stockage : CSA et Cires (Aube), Cigéo/Bure.
  - ⚠️ **À trancher** : la comparaison d'attributs devra être repensée, car « palier » n'a pas de sens pour une usine. On pourrait proposer des modes séparés (« Centrales », « Tous sites ») plutôt qu'un seul pool mélangé.
- [ ] **Nouveaux modes** :
  - satellite uniquement (orthophotos IGN) ;
  - « Historique » : deviner la décennie de mise en service ou le palier ;
  - défi hebdomadaire plus difficile (photo de détail).
- [ ] **Contributions de la promo** : formulaire (Google Form ou template d'issue GitHub) pour proposer des photos, avec validation manuelle (droits, qualité, absence d'indices).
- [ ] Sites étrangers (mode « Europe ») ?
  - ⚠️ **À trancher**, à très long terme.

---

## Annexe — Récapitulatif des décisions à trancher

| # | Phase | Décision | Piste par défaut |
|---|---|---|---|
| 1 | 0 | Indices : distance + attributs, ou un seul type | Les deux, à tester |
| 2 | 0 | Dézoom progressif de l'image | Oui si les photos le permettent |
| 3 | 0 | Nombre d'essais | 5 ou 6 |
| 4 | 0 | Système de score | Victoire + nombre d'essais |
| 5 | 1 | Convention de date de mise en service | Couplage au réseau |
| 6 | 1 | JSON ou YAML pour les données | JSON |
| 7 | 2 | Difficulté manuelle ou statistique | Manuelle |
| 8 | 2 | Stockage des photos originales | Hors du dépôt public |
| 9 | 3 | Framework UI | Svelte ou vanilla TS |
| 10 | 3 | Carte : Leaflet ou SVG statique | SVG statique |
| 11 | 4 | Choix du défi : hash ou planning | Planning (`schedule.json`) |
| 12 | 4 | Niveau d'obfuscation | Encodage léger |
| 13 | 5 | Hébergeur | GitHub Pages |
| 14 | 5 | Nom de domaine personnalisé | Non |
| 15 | 5 | Licence du code | MIT |
| 16 | 6 | PWA | Plus tard |
| 17 | 7 | Backend du classement | Supabase, si besoin |
| 18 | 7 | Authentification | Pseudo seul |
| 19 | 8 | Pool unique ou modes séparés pour les autres sites | Modes séparés |
