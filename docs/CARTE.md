# NucGuessr — Carte du mode Distance

La carte est **vectorielle et sur mesure** : SVG dessiné par le jeu (`src/modes/distance/Carte.svelte`), projection `d3-geo`, zoom et déplacement `d3-zoom`. Aucun serveur de tuiles : le fond de carte est un fichier du dépôt, chargé avec la carte. Choix et tests : [`DECISIONS.md`](DECISIONS.md#phase-6--mode-distance).

## Fichier produit

`src/modes/distance/geo/france.topo.json` (TopoJSON quantifié, ≈ 94 Ko, ≈ 34 Ko gzip, ≈ 8 700 points) :

| Couche | Contenu | Propriétés |
|---|---|---|
| `pays` | France métropolitaine (Corse comprise ; l'outre-mer est coupé par le cadre) et pays voisins, découpés au cadre `[-9,5 ; 40,4 ; 13,5 ; 52,4]` | `id` (code ADM0_A3 : `FRA`, `BEL`, `DEU`…) |
| `fleuves` | 8 grands fleuves (niveau 1) et 25 affluents (niveau 2) | `nom` (français), `niveau` |
| `villes` | 8 grandes villes (niveau 1) et 20 villes repères (niveau 2) | `nom`, `niveau` |

Le fichier ne contient **aucune position de centrale** : la position réelle n'est donnée à la carte qu'en phase réponse, par le round.

## Reconstruire

```sh
node scripts/geo/construire-carte.mjs                 # téléchargements dans <dossier temporaire>/nucguessr-geo
node scripts/geo/construire-carte.mjs --dossier D:/tmp/geo --forcer
```

Il faut Node ≥ 22 et un accès réseau (sources Natural Earth sur GitHub, mapshaper par `npx`). Le script :

1. télécharge les fichiers GeoJSON de Natural Earth **10m, version `v5.1.2`** (étiquette figée du dépôt `nvkelso/natural-earth-vector`), dans un dossier temporaire **hors du dépôt** :
   - `ne_10m_admin_0_countries` (pays),
   - `ne_10m_rivers_lake_centerlines` et `ne_10m_rivers_europe` (fleuves ; le second complète le premier en Europe),
   - `ne_10m_populated_places_simple` (villes) ;
2. filtre : pays de la liste `PAYS`, fleuves de la table `FLEUVES` (sans les lignes qui traversent les lacs), villes françaises des listes `VILLES_NIVEAU_1` / `VILLES_NIVEAU_2` ;
3. lance **mapshaper 0.7.101** (version figée) : découpe au cadre, simplification (`interval=600`, soit 600 m d'écart toléré, `keep-shapes`), suppression des îlots de moins de 4 km², export TopoJSON quantifié (`quantization=100000`) ;
4. affiche le bilan (poids, arcs, points).

Le script écrit le TopoJSON sur une seule ligne ; `npx prettier --write src/modes/distance/geo` le remet ensuite en forme comme le reste du dépôt (contenu identique, `npm run format:check` l'exige). Vite le réduit de toute façon au build.

Les réglages (version, cadre, listes, simplification) sont des constantes en tête du script. **Aucune géométrie n'est saisie à la main** ; seule correction : le nom « Poitier » de Natural Earth est affiché « Poitiers » (nom, pas position). Les affichages (seuils de zoom des affluents et des villes, zoom maximal…) se règlent dans `src/config.ts`, section « Mode Distance : carte ».

## Sources, licences et attributions

| Donnée | Source | Licence |
|---|---|---|
| Pays, côtes, frontières | Natural Earth, *Admin 0 – Countries*, 1:10m, v5.1.2 | domaine public |
| Fleuves | Natural Earth, *Rivers + lake centerlines* et *Rivers, Europe supplement*, 1:10m, v5.1.2 | domaine public |
| Villes | Natural Earth, *Populated places (simple)*, 1:10m, v5.1.2 | domaine public |

Natural Earth est dans le domaine public ([conditions d'utilisation](https://www.naturalearthdata.com/about/terms-of-use/)) : aucune attribution n'est exigée. Le jeu la mentionne tout de même : « Fond de carte : Natural Earth ». Outils : mapshaper (MPL 2.0, utilisé seulement à la construction), d3-geo, d3-zoom, d3-selection, d3-interpolate et topojson-client (ISC, dans le bundle).

## Précision

- Natural Earth 1:10m est une carte à petite échelle : la position des fleuves est juste à environ 1 km près. Écart mesuré entre chaque centrale et le tracé de sa source froide : 0,2 à 2,5 km, sauf Tricastin (5,6 km : la centrale est sur le canal de Donzère-Mondragon, la ligne Natural Earth suit le Rhône). Le rayon « dans le mille » de 5 km absorbe ces écarts.
- Simplification à 600 m : invisible à la vue de départ ; au zoom maximal sur ordinateur (≈ 50 m par pixel), les côtes deviennent anguleuses, ce qui reste cohérent avec le style « synoptique ».
- Les coordonnées des centrales (`data/sites.json`) sont encore `A_VERIFIER` (phase 1) : la distance affichée n'est pas plus juste qu'elles.
