<!--
  Racine de l'application : routage par hash (src/lib/routage.ts).
  `#/` : accueil ; `#/<mode>` : partie du mode (le compte rendu s'affiche à la même adresse).

  Arrivée directe sur `#/<mode>` (lien partagé, rechargement de la page) : on affiche l'accueil avec
  ce mode présélectionné, plutôt que de lancer un chronomètre sur un joueur qui n'est pas prêt.
  Le bouton Précédent ramène d'une partie à l'accueil (la partie en cours est abandonnée).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Accueil from './composants/Accueil.svelte';
  import Partie from './composants/Partie.svelte';
  import { ecrireRoute, lireRoute, type Route } from './lib/routage';
  import { IDS_MODES, MODE_DEFAUT, modeParId, modesProposes } from './modes/registre';
  import type { DefinitionMode } from './modes/types';

  const routeInitiale = lireRoute(location.hash, IDS_MODES);
  /** Mode demandé par l'adresse au chargement (affiché sur l'accueil même s'il n'y est pas proposé d'habitude). */
  const demande = routeInitiale.ecran === 'partie' ? routeInitiale.mode : null;
  if (location.hash !== '#/') history.replaceState(null, '', ecrireRoute({ ecran: 'accueil' }));

  let route = $state<Route>({ ecran: 'accueil' });
  /** Dernier mode choisi pendant la visite (présélectionné en revenant à l'accueil). */
  let preselection: DefinitionMode = $state(modeParId(demande) ?? MODE_DEFAUT);
  /** Change à chaque entrée dans une partie : une nouvelle partie démarre même si le mode est le même. */
  let entree = $state(0);

  const modes = modesProposes(demande);
  const mode = $derived(route.ecran === 'partie' ? modeParId(route.mode) : undefined);

  function suivreAdresse() {
    route = lireRoute(location.hash, IDS_MODES);
    if (route.ecran === 'partie') {
      const m = modeParId(route.mode);
      if (m) preselection = m;
      entree += 1;
    }
  }

  function lancer(m: DefinitionMode) {
    preselection = m;
    location.hash = ecrireRoute({ ecran: 'partie', mode: m.id });
  }

  $effect(() => {
    if (route.ecran === 'accueil') document.title = 'NucGuessr — reconnaître une centrale nucléaire';
  });

  // Après un changement d'écran, on remonte en haut de la page.
  $effect(() => {
    void route;
    untrack(() => window.scrollTo(0, 0));
  });
</script>

<svelte:window onhashchange={suivreAdresse} />

{#if mode}
  {#key entree}
    <Partie {mode} />
  {/key}
{:else}
  <Accueil {modes} initial={preselection} onlancer={lancer} onchoisir={(m) => (preselection = m)} />
{/if}
