# NucGuessr — Architecture du code

Site **100 % statique** : Vite + TypeScript (strict) + **Svelte 5**, CSS natif avec les tokens de la phase 3. Aucun serveur : le tirage, les scores et l'historique sont dans le navigateur. Choix et tests : [`DECISIONS.md`](DECISIONS.md#phase-4--socle-technique).

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | installer les dépendances (Node ≥ 22.18) |
| `npm run dev` | serveur de développement, rechargement à chaud (le mode « Démonstration » est listé) |
| `npm run build` | site de production dans `dist/` (chemins relatifs : `base: './'`) |
| `npm run preview` | servir `dist/` en local |
| `npm run lint` | ESLint (JS, TS, Svelte) puis `svelte-check` (types, accessibilité) |
| `npm run format` / `npm run format:check` | Prettier (écrire / vérifier) |
| `npm test` | Vitest : tous les tests de `tests/` (logique pure, données) |
| `npm run validate:data` | seulement la validation de `data/` |
| `python -m unittest discover scripts/tests` | tests de l'outillage photos (Python, séparés) |

`NUCGUESSR_BASE=/NucGuessr/ npm run build` force un chemin absolu si besoin (par défaut, `./` convient à GitHub Pages quel que soit le nom du dépôt).

## Arborescence

```
index.html                  page unique (lang="fr", favicons, préchargement des polices)
src/
  main.ts                   styles globaux + montage de App.svelte
  App.svelte                routage par hash : accueil ou partie
  config.ts                 TOUTES les constantes réglables et fonctions de score (importé aussi par Node)
  lib/                      logique pure, sans DOM, testée par Vitest
    moteur.ts               moteur de partie générique (rounds, états, score)
    tirage.ts               tirage des rounds (rotation par site + photosTirables)
    hasard.ts               hasard injectable (générateur à graine pour les tests)
    stockage.ts             persistance localStorage versionnée (lecture tolérante, migrations)
    routage.ts              lecture/écriture du hash (#/, #/rapidite…)
    format.ts               nombres à la française (1 640, 12,4 s)
    fiche.ts                fiche courte d'un site (réacteurs, source froide)
    donnees.ts, types.ts    data/sites.json et data/photos.json, typés
  navigateur/photos.ts      URL, préchargement (2 rounds d'avance), « décodée puis peinte »
  etat/                     état partagé de l'application
    profil.svelte.ts        données locales réactives (meilleurs scores, photos vues…)
    preparation.ts          partie tirée et préchargée à l'avance (accueil, « Rejouer »)
  composants/               écrans et briques communs
    Accueil, Partie, Resultats, Bandeau
    PhotoRound              photo d'un round + signal « visible » (départ du chrono)
    GabaritRound            mise en page photo | pupitre (facultatif)
    BandeReponse, Credit, Icone, EnConstruction
  modes/
    types.ts                INTERFACE D'UN MODE (à lire en premier)
    registre.ts             liste des modes (ne pas modifier pour faire évoluer un mode)
    factice/                mode de démonstration, exemple complet et minimal
    rapidite/               phase 5 (écran provisoire « en construction »)
    distance/               phase 6 (écran provisoire « en construction »)
  styles/
    fonts.css, tokens.css   phase 3 (ne pas modifier tokens.css sans relancer les tests de contraste)
    tokens-socle.css        tokens ajoutés en phase 4
    base.css                styles communs (.num, .libelle, .bouton, focus)
tests/
  data/                     validation des données (phase 1)
  socle/                    moteur, tirage, stockage, routage, mise en forme
  rapidite/, distance/      tests des phases 5 et 6
```

## Flux d'une partie

1. **Accueil** (`#/`) : Rapidité est présélectionné. Dès qu'un mode est sélectionné, `preparerPartie` tire ses rounds (`tirerRounds`, avec l'historique local) et **précharge** les photos des rounds 1 à 3.
2. **Lancement** (`Entrée` ou bouton) : l'adresse devient `#/<mode>`. `Partie.svelte` prend la partie préparée, crée la partie du moteur (`creerPartie`), incrémente le numéro de partie (`profil.commencerPartie`).
3. **Round** : le socle marque la photo comme vue, précharge 2 rounds d'avance, puis affiche le composant `Round` du mode. Le mode affiche la photo avec `PhotoRound`, **démarre son chronomètre dans `onvisible`** (photo décodée et peinte), puis appelle `terminer(resultat)` avec les points.
4. **Réponse** (état `reponse` du moteur) : le même composant `Round` reste affiché avec `phase = 'reponse'` (bande de réponse, crédits de la photo). Le socle passe au round suivant au bout de `delaiReponseMs`, ou sur `Entrée` / tap / `passer()`, mais pas avant `antiRebondMs`.
5. **Fin** (état `terminee`) : le socle enregistre le score (`profil.terminerPartie`, sauf mode en construction), prépare déjà la partie suivante, et affiche le **compte rendu** (`Resultats.svelte`) à la même adresse.
6. **Rejouer** (`Entrée` ou bouton) : nouvelle partie du même mode, photos déjà préchargées. Le bouton **Précédent** du navigateur ramène à l'accueil. Un lien partagé ou un rechargement sur `#/<mode>` ouvre l'accueil avec ce mode présélectionné.

```
en_cours ──terminer()──▶ reponse ──délai / Entrée / tap──▶ en_cours (round suivant)
                                                       └─▶ terminee (compte rendu)
```

## Interface d'un mode

Définie et commentée dans [`src/modes/types.ts`](../src/modes/types.ts). Un mode exporte par défaut :

```ts
export default definirMode<MonDetail>({
  id: 'rapidite',                 // dossier src/modes/rapidite/, route #/rapidite
  nom: 'Rapidité',
  resume: '8 rounds, 20 s pour taper le nom du site',
  nbRounds: RAPIDITE_ROUNDS,
  scoreMaxRound: RAPIDITE_SCORE_MAX,
  filtrePhotos: 'rapidite',       // photosTirables
  delaiReponseMs: (r) => (r.statut === 'juste' ? 1500 : 3000),  // null : attendre le joueur
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  passerAuTap: true,              // false si le clic sert encore en phase réponse (carte)
  Round: RoundRapidite,           // composant Svelte, reçoit PropsRound<MonDetail>
  colonnesRecap: [{ titre: 'Temps', valeur: (r) => formaterSecondes(r.detail.tempsMs), numerique: true }],
  mesures: (resultats) => [{ libelle: 'Temps moyen', valeur: '5,4 s' }],   // 3 au plus
  Recap: CarteRecap,              // facultatif : affiché dans le compte rendu
});
```

Le composant `Round` reçoit (`PropsRound<D>`) : `round` (site + photo), `numero`, `total`, `phase` (`'jeu' | 'reponse'`), `resultat` (en phase réponse), `sites`, `aleatoire`, et deux fonctions : `terminer(resultat)` et `passer()`. Un `ResultatRound<D>` contient `points` (entier ≥ 0, calculé avec `scoreRapidite` / `scoreDistance`), `statut` (`'juste' | 'faux' | 'neutre'`), `reponse` (texte de la réponse du joueur) et `detail` (propre au mode).

Règles à respecter dans un mode :
- **chronomètre** : démarrer dans `onvisible` de `PhotoRound`, mesurer avec `performance.now()` et `requestAnimationFrame` ;
- **anti-triche** : pendant le jeu, ne jamais afficher le nom du site ni les crédits de la photo (`PhotoRound` ne montre les crédits que si `revele`) ;
- **hasard** : utiliser la prop `aleatoire`, jamais `Math.random` directement (tests reproductibles) ;
- **style** : uniquement les variables de `tokens.css` / `tokens-socle.css` ([`design/TOKENS.md`](../design/TOKENS.md)) ; styles du mode dans ses composants (bloc `<style>`, isolé par Svelte).

## Où mettre quoi (phases 5 et 6 en parallèle)

| Je veux… | Fichier |
|---|---|
| construire le mode Rapidité | `src/modes/rapidite/` uniquement (remplacer `RoundRapidite.svelte`, compléter `index.ts`, retirer `enConstruction`) |
| construire le mode Distance | `src/modes/distance/` uniquement (idem ; dépendances de carte ajoutées par la phase 6) |
| ajouter des constantes | `src/config.ts` : Rapidité **à la fin de la section « Mode Rapidité »**, Distance **à la fin de la section « Mode Distance »** |
| tester un mode | `tests/rapidite/*.test.ts`, `tests/distance/*.test.ts` |
| logique pure propre au mode (normalisation des noms, distance) | un fichier `.ts` dans le dossier du mode, testé dans `tests/<mode>/` |
| une préférence (son…) | `profil.changerPreference('rapidite.son', true)`, lecture `profil.donnees.preferences` |

Ne pas modifier les composants communs (`src/composants/`, `src/lib/`, `src/modes/types.ts`, `registre.ts`) pendant les phases 5 et 6 : composer avec eux (snippets `children` de `PhotoRound`, `GabaritRound`), ou copier une brique dans le dossier du mode. Si un changement commun est indispensable, le signaler pour qu'il soit fait une seule fois. `src/config.ts` est exclu de Prettier pour qu'un `npm run format` ne le réécrive pas en entier.

Le mode factice (`#/factice`) est listé sur l'accueil en développement seulement (`FACTICE_VISIBLE_EN_PRODUCTION`) ; en production, le lien `#/factice` le présélectionne.
