# Ajouter des photos à NucGuessr

Ce guide explique, pas à pas, comment trouver des photos de centrales, vérifier qu'on a le droit de les utiliser, les préparer pour qu'elles ne trahissent pas la réponse, puis les intégrer au jeu. Aucune compétence en programmation n'est nécessaire : il faut savoir remplir un tableur et lancer une commande.

**En résumé :**

1. Trouver une photo (toutes sources acceptées, usage interne) et noter sa provenance.
2. La copier dans `photos_sources/` (ce dossier n'est jamais envoyé sur GitHub).
3. Recadrer ou flouter les panneaux, logos et noms visibles.
4. Noter ses crédits dans `photos_sources/credits.csv`.
5. Lancer `python scripts/process_photos.py`, lire le bilan, regarder le résultat.

---

## 1. Sources et licences

NucGuessr est un jeu à **usage interne** (promo) : toutes les sources sont acceptées, quelle que soit la licence.

| Source | Ce qu'il faut noter |
|---|---|
| **Wikimedia Commons**, Flickr, Openverse | Auteur, licence affichée, lien vers la page de l'original |
| **Photos EDF** (pages des centrales, médiathèque, réseaux sociaux), y compris les vues de **drone** | Auteur `EDF` (ou le photographe cité), licence `droits réservés`, lien vers la page |
| **Web en général** (presse, blogs, sites des communes…) | Auteur ou site, licence `droits réservés`, lien vers la page |
| **Orthophotos IGN** (BD ORTHO, BD ORTHO historique) | Auteur « IGN – BD ORTHO », licence `Etalab-2.0`, lien vers la page de la donnée |
| **Photos personnelles** de la promo | Nom de l'auteur, licence `accord-auteur`, lien vide |

Le script accepte toute licence (CC, y compris NC et ND, `droits réservés`, `Etalab 2.0`, `domaine public`, `accord-auteur`). Seule exigence : une licence Creative Commons ou Etalab doit avoir son lien (`url_source`). Le crédit et le lien ne s'affichent qu'**après** le round.

Évitez les images portant un **filigrane** (banques d'images) ou une légende incrustée : elles trahissent la réponse ou sont illisibles. Pour les orthophotos IGN récentes, la centrale est souvent pixellisée par l'IGN (zone sensible) : préférez les couches historiques ou d'autres vues.

### Trouver des photos sur Wikimedia Commons

- Partez de l'article Wikipédia de la centrale : en bas de page ou dans la colonne de gauche, le lien « Wikimedia Commons » mène à la catégorie de la centrale, souvent organisée en sous-catégories (vues aériennes, tours de refroidissement, etc.).
- Cherchez aussi dans les catégories voisines : la commune, le fleuve (« Rhône à Cruas »), les vues prises depuis un village ou une colline voisine. Les meilleures photos pour le jeu sont souvent celles où la centrale est **dans son paysage**.
- Préférez les fichiers d'au moins **1 600 px de large** (la taille s'affiche sous l'image). En dessous de 1 200 px, la photo sera floue en jeu : le script le signale.

### Noter les crédits d'une photo Commons

Sur la page `File:` de la photo, descendez jusqu'à la section **« Licensing » / « Conditions d'utilisation »** :

1. Notez la licence affichée. Plusieurs licences au choix (par exemple GFDL + CC BY-SA 3.0) : prenez la CC.
2. L'auteur est-il clairement indiqué (champ « Author / Auteur ») ? Notez-le **tel quel** (nom ou pseudonyme). Si l'auteur demande une formule précise d'attribution (« Attribution: … »), notez-la à la place.
3. Le lien à noter est l'adresse de la page `File:` (elle commence par `https://commons.wikimedia.org/wiki/File:`), **pas** celle du fichier image `upload.wikimedia.org`.

Pour télécharger : bouton « Télécharger » / « Download » en haut de la page, en choisissant la **taille originale**.

### Orthophotos IGN (vues satellite)

- Sur le Géoportail, n'affichez **que** la couche « Photographies aériennes » : désactivez toutes les autres couches (noms de lieux, routes, limites) **avant** la capture, sinon le nom de la commune ou de la centrale apparaît.
- Cadrez l'îlot nucléaire et un peu d'environnement (fleuve ou côte), à une échelle où l'on reconnaît les bâtiments.
- Crédit : auteur `IGN – BD ORTHO`, licence `Etalab-2.0`, lien vers la page de la donnée sur geoservices.ign.fr ou cartes.gouv.fr. Type : `satellite`.

### Photos personnelles de la promo

- Demandez un accord **écrit** (message ou mail) précisant que la photo sera publiée dans NucGuessr avec son nom ; gardez ce message.
- Uniquement des photos prises **depuis l'espace public** (route, chemin, belvédère, visite autorisée où les photos étaient permises).
- Licence : `accord-auteur` ; lien (`url_source`) : laisser vide.

---

## 2. Préparer la photo (anti-triche)

Le joueur doit reconnaître la centrale, **pas lire son nom**. Avant tout traitement, ouvrez chaque photo en grand et cherchez :

- les **panneaux** (« Centrale nucléaire de … », panneaux de direction, noms de commune, d'entreprise) ;
- les **logos** EDF ou autres, sur les bâtiments, les grilles, les véhicules ;
- les **noms et inscriptions** sur les bâtiments, bateaux, quais ;
- les **légendes incrustées** (date, nom du photographe, nom du lieu ajouté dans un coin) ;
- les **plaques d'immatriculation** et **visages** reconnaissables (respect de la vie privée).

**Que faire :**

1. **Recadrer** si possible (le plus simple et le plus propre) : on enlève la partie de l'image qui contient le panneau, en gardant un format paysage (idéalement 3:2 ou 16:9).
2. Sinon **flouter fort ou masquer** la zone : pixellisation à gros carreaux, ou un rectangle de couleur. Un flou léger se lit encore : il doit être impossible de deviner une seule lettre.

Outils gratuits : **Photos** de Windows (recadrer), **GIMP** (sélection rectangulaire, puis *Filtres → Flou → Pixeliser*, taille de bloc ≥ 30 px), **Photopea** dans le navigateur (même principe), **Aperçu** sur Mac. Enregistrez le résultat dans `photos_sources/` (format JPEG qualité maximale ou PNG) ; gardez l'original ailleurs si vous voulez pouvoir y revenir.

Ce qui n'est **pas** de la triche et peut rester : la forme des tours, le nombre de réacteurs, le fleuve ou la mer, le relief, une fresque peinte sur une tour, une architecture caractéristique. C'est exactement ce qu'on veut faire reconnaître.

---

## 3. Noter les crédits : `photos_sources/credits.csv`

Toutes les informations sur les photos sont dans **un seul tableau**, `photos_sources/credits.csv`, une ligne par photo. Il s'ouvre avec Excel, LibreOffice Calc ou un éditeur de texte.

Pour le créer, ou y ajouter automatiquement une ligne vide pour chaque nouvelle image du dossier :

```
python scripts/process_photos.py --preparer
```

Les colonnes :

| Colonne | Contenu | Exemple |
|---|---|---|
| `fichier` | Nom du fichier dans `photos_sources/` (sous-dossiers permis : `bugey/vue1.jpg`). Le nom n'a aucune importance : il n'est jamais publié. | `bugey_depuis_la_colline.jpg` |
| `site` | Identifiant du site (liste ci-dessous) | `bugey` |
| `type` | `sol`, `aérienne`, `satellite` ou `détail` (accents facultatifs) | `aérienne` |
| `difficulte` | `1` facile, `2` moyenne, `3` difficile (voir ci-dessous) | `2` |
| `auteur` | Auteur tel qu'indiqué sur la page de l'original | `Jean Dupont` |
| `licence` | Telle qu'indiquée : `CC BY-SA 4.0`, `CC BY-NC 2.0`, `Etalab 2.0`, `domaine public`, `droits réservés`, `accord-auteur`… | `CC BY-SA 4.0` |
| `url_source` | Lien vers la page de l'original (obligatoire pour les licences CC et Etalab, conseillé sinon) | `https://commons.wikimedia.org/wiki/File:…` |

**Identifiants des sites :** `belleville`, `blayais`, `bugey`, `cattenom`, `chinon`, `chooz`, `civaux`, `cruas`, `dampierre`, `flamanville`, `golfech`, `gravelines`, `nogent`, `paluel`, `penly`, `saint-alban`, `saint-laurent`, `tricastin`. (Quelques variantes sont comprises : `Nogent-sur-Seine`, `St Laurent`…)

**Difficulté** (à juger honnêtement, en vous mettant à la place d'un camarade de promo) :

- **1 — facile** : vue d'ensemble, on reconnaît la centrale en quelques secondes si on la connaît (silhouette, nombre de tours, environnement) ;
- **2 — moyenne** : vue partielle, aérienne ou lointaine, qui demande de réfléchir ;
- **3 — difficile** : détail, angle inhabituel, une partie seulement des installations.

Les photos de difficulté 3 ne sortent **qu'en mode Distance** (pas de limite de temps) ; le mode Rapidité (20 s) n'utilise que les difficultés 1 et 2. Il faut donc **au moins 2 photos de difficulté 1 ou 2 par site**.

Exemple de fichier (Excel en français enregistre avec des `;`, c'est très bien ; les `,` marchent aussi) :

```
fichier;site;type;difficulte;auteur;licence;url_source
bugey_colline.jpg;bugey;sol;1;Jean Dupont;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:Exemple_1.jpg
cruas_ortho.png;cruas;satellite;2;IGN – BD ORTHO;Etalab 2.0;https://geoservices.ign.fr/bdortho
civaux_vacances.jpg;civaux;détail;3;Camille Martin (promo 2027);accord-auteur;
```

Une ligne qui commence par `#` est ignorée (pratique pour mettre une photo de côté). Dans Excel : *Fichier → Enregistrer sous → CSV (séparateur : point-virgule)*.

---

## 4. Lancer le traitement

Une seule fois, installer Pillow (dans un environnement virtuel, pour ne rien installer sur tout l'ordinateur) :

```
python -m venv .venv
.venv\Scripts\activate          (Windows ; sur Mac/Linux : source .venv/bin/activate)
pip install -r scripts/requirements.txt
```

Puis, depuis la racine du dépôt, à chaque ajout de photos :

```
python scripts/process_photos.py
```

Pour chaque ligne du CSV, le script :

1. remet la photo dans le bon sens (orientation enregistrée par le téléphone) ;
2. la réduit à **1 600 px de large** au maximum (1 200 px de haut) ;
3. la convertit en **WebP**, qualité 80, réduite automatiquement si le fichier dépasse **300 Ko** ;
4. **supprime toutes les métadonnées** : EXIF (appareil, date, **position GPS**), XMP, profil de couleur ;
5. l'enregistre dans `public/photos/` sous un **nom opaque** (`3f9a1c…webp`), calculé à partir du contenu de l'image et jamais de son nom ;
6. met à jour `data/photos.json` (ne jamais modifier ce fichier à la main).

Relancer le script ne crée **jamais de doublon** : on peut le lancer aussi souvent qu'on veut.

**Images de test :** tant qu'un site n'a pas de vraie photo, il garde 3 images « PHOTO DE TEST » générées par `scripts/generate_placeholders.py`. **Dès que le site a une vraie photo, ses images de test sont retirées.** Pour les recréer (par exemple après avoir retiré toutes les vraies photos d'un site) : `python scripts/generate_placeholders.py`.

**Modifier ou retirer une photo :**

- *corriger un crédit* : modifiez la ligne dans le CSV et relancez ;
- *recadrer à nouveau* : remplacez le fichier dans `photos_sources/` et relancez : l'ancienne version est retirée ;
- *retirer une photo* : supprimez sa ligne du CSV (ou mettez un `#` devant) et relancez ;
- une photo ajoutée par **quelqu'un d'autre** (vous n'avez pas son original) n'est jamais retirée par votre passage du script : pour la retirer, supprimez son entrée dans `data/photos.json` et son fichier dans `public/photos/`, puis relancez le script.

---

## 5. Vérifier le résultat

1. **Lisez le bilan** affiché par le script : les erreurs (ligne du CSV et raison), les avertissements (photo trop petite, en portrait, trop lourde) et, pour chaque site, le nombre de vraies photos et de substituts.
2. **Regardez chaque nouvelle photo** dans `public/photos/` (le fichier le plus récent) : bon sens, aucun panneau ni nom lisible, netteté correcte.
3. Lancez le contrôle complet (rien n'est modifié) :
   ```
   python scripts/process_photos.py --verifier
   python -m unittest discover scripts/tests
   ```
4. Envoyez sur GitHub **uniquement** `data/photos.json` et `public/photos/` : `photos_sources/` est ignoré par git, ne forcez jamais son ajout (les noms et EXIF des originaux trahissent la réponse).

---

## 6. Check-list anti-triche

Avant chaque envoi :

- [ ] Aucun **panneau, logo, nom ou légende incrustée** lisible sur la photo, même en zoomant.
- [ ] Le fichier publié a un **nom opaque** (`public/photos/<hash>.webp`) : le nom du fichier Wikimedia (« Centrale_nucléaire_du_Bugey.jpg ») ne doit **jamais** se retrouver dans `public/` ni dans un nom de fichier.
- [ ] **Aucune métadonnée** dans les fichiers publiés : `--verifier` le contrôle (EXIF, GPS, XMP, profil ICC).
- [ ] Le texte **`alt`** est neutre (« Vue aérienne d'une centrale nucléaire à identifier ») : il est écrit par le script à partir du type, jamais à la main.
- [ ] Pour les orthophotos : **toutes les couches de noms désactivées** avant la capture.
- [ ] Pas de capture d'écran avec du texte autour (barre d'adresse, légende, échelle avec le nom de la commune).
- [ ] Le lien `url_source` contient souvent le nom de la centrale : le jeu ne l'affiche qu'**après** le round, avec l'auteur et la licence (écran de réponse et page « À propos »).
- [ ] Une photo n'est **pas reconnaissable uniquement** grâce à un détail effacé : si, une fois le panneau flouté, il ne reste rien à reconnaître, la photo ne vaut pas la peine.
- [ ] Avant la mise en ligne : **plus aucun substitut** (`"substitut": true`) dans `data/photos.json`.

---

## 7. Conseils de variété

Objectif v1 : **3 à 5 vraies photos par site** (55 à 90 au total), dont au moins 2 de difficulté 1 ou 2. Plus la banque est grande, plus le joueur reconnaît la centrale plutôt que la photo.

Pour chaque site, essayez de couvrir des angles différents :

- une **vue lointaine** dans le paysage (depuis une colline, l'autre rive, une route), souvent la plus reconnaissable : difficulté 1 ;
- une **vue aérienne** ou une **orthophoto** IGN, qui montre l'implantation (fleuve, côte, disposition des réacteurs) : difficulté 1 ou 2 ;
- un **détail** (une tour, la prise d'eau, la salle des machines, un poste électrique) : difficulté 2 ou 3.

À éviter :

- des photos presque identiques du même site (même point de vue, même saison) : elles se « reconnaissent » entre elles ;
- les photos où la centrale n'est reconnaissable **que** par un panneau ou une inscription ;
- les photos trop sombres, floues, ou où la centrale n'occupe qu'un coin minuscule ;
- les panaches de vapeur seuls, sans installation visible (indiscernables d'un site à l'autre) ;
- les photos en portrait (le jeu est en paysage : recadrez-les) ;
- un même photographe ou une même série pour toutes les photos d'un site, si possible.

Variez aussi les saisons, la lumière et la météo : c'est plus agréable à jouer et plus juste pour ceux qui connaissent le site en vrai.
