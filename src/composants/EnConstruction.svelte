<!--
  Écran de round provisoire d'un mode pas encore construit (Rapidité : phase 5, Distance : phase 6).
  Il respecte l'interface d'un mode (photo, `terminer`, phase réponse) pour que la partie se déroule
  de bout en bout ; les points valent 0 et la partie n'est pas enregistrée (`enConstruction: true`).
  À remplacer par le vrai composant du mode, dans src/modes/<mode>/.
-->
<script lang="ts">
  import { deuxChiffres } from '../lib/format';
  import type { PropsRound } from '../modes/types';
  import BandeReponse from './BandeReponse.svelte';
  import GabaritRound from './GabaritRound.svelte';
  import PhotoRound from './PhotoRound.svelte';

  type Props = PropsRound<null> & { nomMode: string; phaseFeuilleDeRoute: number };
  let { round, numero, phase, terminer, passer, nomMode, phaseFeuilleDeRoute }: Props = $props();

  let visible = $state(false);
  let boutonReveler: HTMLButtonElement | undefined = $state();
  let boutonSuivant: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (phase === 'reponse') boutonSuivant?.focus();
    else if (visible) boutonReveler?.focus();
  });

  function reveler() {
    terminer({ points: 0, statut: 'neutre', reponse: '—', detail: null });
  }
</script>

<GabaritRound>
  {#snippet ecran()}
    <PhotoRound
      photo={round.photo}
      legende="Vue {deuxChiffres(numero)}"
      revele={phase === 'reponse'}
      onvisible={() => (visible = true)}
    >
      {#if phase === 'reponse'}
        <BandeReponse statut="neutre" nom={round.site.nom_court} points={0} />
      {/if}
    </PhotoRound>
  {/snippet}
  {#snippet pupitre()}
    <h2 class="libelle">Mode {nomMode}</h2>
    <p>
      Ce mode est en construction (phase {phaseFeuilleDeRoute} de la feuille de route). Cet écran provisoire laisse parcourir
      une partie&nbsp;: aucun point n'est compté, rien n'est enregistré.
    </p>
    {#if phase === 'jeu'}
      <button class="bouton" type="button" bind:this={boutonReveler} disabled={!visible} onclick={reveler}>
        Voir la réponse
      </button>
    {:else}
      <button class="bouton" type="button" bind:this={boutonSuivant} onclick={passer}>
        Suivant <kbd>Entrée</kbd>
      </button>
    {/if}
  {/snippet}
</GabaritRound>

<style>
  h2 {
    margin: 0;
    padding-bottom: var(--esp-2);
    border-bottom: var(--trait-fin) solid var(--c-trait);
    font-weight: var(--graisse-normale);
  }
  p {
    color: var(--c-texte-2);
  }
  .bouton {
    align-self: flex-start;
  }
</style>
