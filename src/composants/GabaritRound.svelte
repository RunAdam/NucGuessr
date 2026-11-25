<!--
  Gabarit d'un écran de round, direction « Synoptique » : la photo à gauche (zone `ecran`), une zone
  facultative sous la photo (`sousEcran` : chrono et barre de temps du mode Rapidité), et le pupitre
  à droite (`pupitre` : saisie, choix, carte…). Sur mobile (< 720 px) : tout en colonne.
  Facultatif : un mode peut composer son propre écran.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { ecran, sousEcran, pupitre }: { ecran: Snippet; sousEcran?: Snippet; pupitre: Snippet } = $props();
</script>

<div class="gabarit" class:avec-sous-ecran={!!sousEcran}>
  <div class="zone-ecran">{@render ecran()}</div>
  {#if sousEcran}<div class="zone-sous-ecran">{@render sousEcran()}</div>{/if}
  <div class="zone-pupitre">{@render pupitre()}</div>
</div>

<style>
  .gabarit {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--largeur-pupitre);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'ecran pupitre';
    column-gap: var(--esp-5);
  }
  .avec-sous-ecran {
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas: 'ecran pupitre' 'sous pupitre';
  }
  .zone-ecran {
    grid-area: ecran;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .zone-ecran > :global(*) {
    flex: 1;
  }
  .zone-sous-ecran {
    grid-area: sous;
  }
  .zone-pupitre {
    grid-area: pupitre;
    display: flex;
    flex-direction: column;
    gap: var(--esp-3);
    min-height: 0;
  }
  @media (max-width: 719px) {
    .gabarit,
    .avec-sous-ecran {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(12rem, 1fr) auto auto;
      grid-template-areas: 'ecran' 'sous' 'pupitre';
      row-gap: var(--esp-2);
    }
  }
</style>
