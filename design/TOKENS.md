# Guide des design tokens (phases 4 à 6)

À l'intention de ceux (humains ou agents) qui codent l'interface. Les valeurs vivent dans **un seul fichier**, [`src/styles/tokens.css`](../src/styles/tokens.css) (variables CSS commentées) ; les polices dans [`src/styles/fonts.css`](../src/styles/fonts.css). Exemple de référence : [`direction-a-synoptique.html`](direction-a-synoptique.html), qui n'utilise que ces tokens.

## Mise en place

```css
/* point d'entrée CSS de l'application, dans cet ordre */
@import "./styles/fonts.css";
@import "./styles/tokens.css";
```

`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="icon" href="/favicon-32.png" sizes="32x32">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<meta name="theme-color" content="#0a0e13">`. Les chemins `/fonts/…` et `/favicon…` sont préfixés par Vite avec `base` au build.

## Règles

1. **Aucune valeur en dur.** Pas de `#hex`, de `px` de taille de texte, de durée ni de rayon dans les composants : toujours `var(--…)`. Si un token manque, l'ajouter dans `tokens.css` (commenté), puis relancer `python -I design/tests/contraste.py` s'il s'agit d'une couleur.
2. **Un seul accent.** `--c-accent` (bleu Tcherenkov) ne sert qu'à ce qui est *vivant* ou *actif* : temps restant (chrono, barre), focus, suggestion active, bouton principal (un seul par écran), meilleur score, repère du joueur sur la carte. Jamais pour décorer, jamais un deuxième accent.
3. **Statut = couleur + forme.** `--c-succes` et `--c-erreur` ne portent jamais seuls l'information : toujours avec l'icône ✓ / ✕ (SVG, voir les `<symbol>` du prototype, jamais d'emoji), un texte (« −2 s », « Temps écoulé »), un barré ou des hachures.
4. **Tous les chiffres en `--police-chiffres`** avec `font-variant-numeric: var(--chiffres-variante)` : chrono, score, points, distances, numéros de round. Séparateur de milliers : espace insécable U+00A0 (« 1 640 »), virgule décimale (« 12,4 s »), unité séparée par U+00A0. Les caractères U+202F et U+2007 sont absents du sous-ensemble de police : ne pas les utiliser. Pas de zéro de tête au chrono : largeur fixe par `min-width: 4ch; text-align: right`.
5. **Libellés d'instrument** (`ROUND`, `SCORE`, `NOM DU SITE`, en-têtes de tableau) : `--police-chiffres`, `--taille-micro`, capitales (`text-transform: uppercase`), `letter-spacing: var(--interlettre-libelle)`, couleur `--c-texte-2`. Le texte courant et les noms de sites restent en `--police-texte`.
6. **Graisses : 400 et 600 uniquement**, pas d'italique (non chargés : le navigateur les fabriquerait).
7. **Structure par filets, pas par cartes.** Séparer avec `--trait-fin` + `--c-trait`, pas avec des ombres. Rayons : `--rayon-1` (2 px) pour champs et boutons, `--rayon-rond` seulement pour les marqueurs et voyants ronds. Pas de `box-shadow` décoratif ; seul le halo de focus (`0 0 0 3px var(--c-accent-doux)`) et le halo d'erreur sont admis.
8. **Fond quasi noir.** `--c-fond` pour la page, `--c-surface` pour les panneaux, `--c-surface-2` pour les champs et la liste de suggestions.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--c-fond` | `#0a0e13` | fond de page (déclarer aussi `color-scheme: dark`, déjà dans `:root`) |
| `--c-surface` | `#10161d` | panneaux, ligne dépliée d'un tableau |
| `--c-surface-2` | `#161e27` | champ de saisie, suggestions, rail de la barre de temps |
| `--c-trait` | `#253140` | filets, séparateurs (décoratif, pas de contraste exigé) |
| `--c-trait-fort` | `#627285` | contour des composants interactifs au repos, graduations courtes |
| `--c-texte` | `#e4eaf0` | texte principal, chiffres |
| `--c-texte-2` | `#a3afbc` | texte secondaire, libellés |
| `--c-texte-3` | `#8593a2` | unités, graduations, **texte fantôme** de l'autocomplétion |
| `--c-accent` | `#4db8ff` | voir règle 2 |
| `--c-accent-doux` | accent à 14 % | fond de la suggestion active, halo de focus |
| `--c-sur-accent` | `#04121f` | texte posé sur un aplat d'accent (bouton principal) |
| `--c-succes`, `--c-succes-doux` | `#5fd39a` | bonne réponse (avec ✓) |
| `--c-erreur`, `--c-erreur-doux` | `#ff6b5e` | mauvaise réponse, segment perdu, barre sous 5 s (avec ✕, barré, hachures) |

Contrastes (WCAG AA, tous ≥ seuil) : [`tests/contraste-sortie.txt`](tests/contraste-sortie.txt).

## Typographie

| Token | Valeur | Usage |
|---|---|---|
| `--police-texte` | IBM Plex Sans | texte, titres, noms de sites, saisie |
| `--police-chiffres` | IBM Plex Mono | tous les nombres, libellés d'instrument |
| `--graisse-normale` / `--graisse-forte` | 400 / 600 | |
| `--chiffres-variante` | `tabular-nums` | avec `font-variant-numeric` |
| `--taille-micro` | 11 px | libellés en capitales |
| `--taille-petite` | 13 px | légendes, graduations, journal |
| `--taille-base` | 16 px | texte courant |
| `--taille-saisie` | 20 px | champ de saisie (≥ 16 px : pas de zoom automatique sur iOS) |
| `--taille-titre` | 24 px | nom du site révélé, titres |
| `--taille-score` | 20 → 28 px (fluide) | score du bandeau, mesures de fin |
| `--taille-chrono` | 30 → 44 px (fluide) | chrono |

## Espacements et dimensions

`--esp-1` à `--esp-7` : 4, 8, 12, 16, 24, 32, 48 px. Marges latérales : `--esp-5` sur bureau, `--esp-3` sur mobile. `--hauteur-barre-temps` 12 px, `--hauteur-saisie` 52 px, `--hauteur-suggestion` 40 px (cible tactile), `--largeur-max-jeu` 1280 px.

## Animations

Chaque animation a un rôle ; il n'y en a pas d'autre.

| Token | Valeur | Rôle |
|---|---|---|
| `--duree-instant` | 80 ms | changement de suggestion active, survol |
| `--duree-courte` | 160 ms | apparition de la liste de suggestions et du « −2 s » |
| `--duree-secousse` + `--courbe-secousse` + `--amplitude-secousse` | 300 ms, ±6 px | secousse du champ après une mauvaise réponse |
| `--duree-penalite` | 900 ms | le segment perdu et le « −2 s » restent visibles |
| `--duree-saut-temps` | 450 ms | puis s'effacent |
| `--duree-revelation` + `--courbe-sortie` | 240 ms | la bande de bonne réponse monte sur la photo |
| `--duree-camera-carte` | 700 ms | recadrage de la carte sur repère + réponse (Distance) |

La barre de temps n'utilise **pas** de transition CSS : sa largeur est recalculée à chaque `requestAnimationFrame` à partir de `performance.now()` (phase 5.3). Au saut de −2 s, la largeur saute instantanément ; c'est le segment hachuré qui rend le saut visible.

`--seuil-alerte-s` (5) est lu en JavaScript (`getComputedStyle(document.documentElement).getPropertyValue('--seuil-alerte-s')`) : sous ce seuil, ajouter un attribut (`data-alerte`) qui passe la barre et le chrono en `--c-erreur`.

### `prefers-reduced-motion`

`tokens.css` met déjà à zéro `--amplitude-secousse`, `--duree-saut-temps`, `--duree-camera-carte` et `--duree-revelation` sous `@media (prefers-reduced-motion: reduce)`. Donc, si les composants utilisent ces tokens :
- la secousse n'a plus d'amplitude : l'erreur reste signalée par le **contour rouge**, l'icône ✕, le halo, le barré et le « −2 s » ;
- le « −2 s » apparaît et disparaît sans glisser ; la bande de réponse apparaît sans monter ;
- la barre de temps continue de diminuer (c'est une information, pas une décoration).

Ne pas utiliser `navigator.vibrate` quand `prefers-reduced-motion: reduce` est actif.

## Carte (mode Distance)

| Token | Usage |
|---|---|
| `--carte-mer` / `--carte-terre` | aplats ; la mer est plus sombre que le fond de page |
| `--carte-frontiere`, `--carte-frontiere-epaisseur` | contour de la France (≥ 3:1 sur la mer) |
| `--carte-limite-region` | limites administratives, si on les affiche (phase 6) |
| `--carte-fleuve`, `--carte-fleuve-epaisseur` | fleuves, bleu désaturé, distinct de l'accent |
| `--carte-ville` | points et noms de villes repères (`--taille-petite`) |
| `--carte-marqueur-joueur` | repère du joueur : rond plein + anneau, couleur accent |
| `--carte-marqueur-reponse` | position réelle : **losange** blanc (forme différente du repère) |
| `--carte-trait`, `--carte-trait-tirets`, `--carte-trait-epaisseur` | trait repère → réponse, en tirets |
| `--carte-cercle-parfait` | cercle des 5 km « dans le mille », si on l'affiche |

Les traits gardent leur épaisseur au zoom (`vector-effect: non-scaling-stroke` en SVG). Échantillon : [`carte-style.svg`](carte-style.svg).

## Ce qu'il ne faut pas faire

Dégradés (sauf sur les photos), glassmorphisme (`backdrop-filter`), ombres portées, coins arrondis au-delà de 2 px, emojis, trèfle radioactif, jaune et noir, texte centré « titre + sous-titre + deux boutons », un deuxième accent, des chiffres en police proportionnelle, une animation sans rôle.
