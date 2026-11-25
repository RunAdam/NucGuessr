<!--
  Round du mode factice : la photo, puis quelques sites proposés ; on clique (ou on tape 1 à 4).
  Montre le contrat d'un mode : attendre `onvisible` avant de mesurer le temps, appeler `terminer`
  une seule fois avec les points, afficher la réponse en phase `reponse`.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { FACTICE_NB_CHOIX, RAPIDITE_DUREE_MS, scoreRapidite } from '../../config';
  import BandeReponse from '../../composants/BandeReponse.svelte';
  import GabaritRound from '../../composants/GabaritRound.svelte';
  import PhotoRound from '../../composants/PhotoRound.svelte';
  import { deuxChiffres, formaterDecimal, formaterSecondes } from '../../lib/format';
  import { melanger } from '../../lib/hasard';
  import type { PropsRound } from '../types';
  import type { DetailFactice } from './index';

  let { round, numero, phase, resultat, sites, aleatoire, terminer, passer }: PropsRound<DetailFactice> = $props();

  // Propositions : le bon site et des sites tirés au hasard, dans un ordre mélangé (fixées au montage).
  const choix = (() => {
    const autres = melanger(
      sites.filter((s) => s.id !== round.site.id),
      aleatoire,
    ).slice(0, FACTICE_NB_CHOIX - 1);
    return melanger([round.site, ...autres], aleatoire);
  })();

  let debut: number | null = $state(null);
  let ecouleMs = $state(0);
  let choisi: string | null = $state(null);
  let boutons: HTMLButtonElement[] = $state([]);
  let boutonSuivant: HTMLButtonElement | undefined = $state();

  /** La photo est affichée : le temps commence à compter. */
  function photoVisible() {
    debut = performance.now();
    boutons[0]?.focus();
  }

  function choisir(id: string) {
    if (debut === null || phase !== 'jeu' || choisi) return;
    choisi = id;
    const tempsMs = performance.now() - debut;
    const juste = id === round.site.id;
    terminer({
      points: juste ? scoreRapidite(RAPIDITE_DUREE_MS - tempsMs) : 0,
      statut: juste ? 'juste' : 'faux',
      reponse: choix.find((s) => s.id === id)?.nom_court ?? id,
      detail: { tempsMs, choixId: id },
    });
  }

  // Chronomètre affiché (indicatif) : requestAnimationFrame + performance.now(), jamais setInterval.
  onMount(() => {
    let raf = 0;
    const boucle = () => {
      if (debut !== null && phase === 'jeu') ecouleMs = performance.now() - debut;
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    if (phase === 'reponse') boutonSuivant?.focus();
  });

  function touche(e: KeyboardEvent) {
    if (phase !== 'jeu' || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = Number(e.key);
    const site = Number.isInteger(n) && n >= 1 ? choix[n - 1] : undefined;
    if (site) {
      e.preventDefault();
      choisir(site.id);
    }
  }
</script>

<svelte:window onkeydown={touche} />

<GabaritRound>
  {#snippet ecran()}
    <PhotoRound
      photo={round.photo}
      legende="Vue {deuxChiffres(numero)}"
      revele={phase === 'reponse'}
      onvisible={photoVisible}
    >
      {#if phase === 'reponse' && resultat}
        <BandeReponse
          statut={resultat.statut}
          nom={round.site.nom_court}
          detail={resultat.statut === 'juste'
            ? formaterSecondes(resultat.detail.tempsMs)
            : `Vous avez choisi ${resultat.reponse}.`}
          points={resultat.points}
        />
      {/if}
    </PhotoRound>
  {/snippet}
  {#snippet pupitre()}
    <div class="entete">
      <h2 class="libelle" id="question-{numero}">Quel est ce site&nbsp;?</h2>
      <span class="temps num" aria-hidden="true">
        {formaterDecimal((phase === 'jeu' ? ecouleMs : (resultat?.detail.tempsMs ?? 0)) / 1000)}&nbsp;s
      </span>
    </div>
    <div class="choix" role="group" aria-labelledby="question-{numero}">
      {#each choix as site, i (site.id)}
        <button
          type="button"
          class="option"
          class:juste={phase === 'reponse' && site.id === round.site.id}
          class:faux={phase === 'reponse' && site.id === choisi && site.id !== round.site.id}
          disabled={debut === null || phase === 'reponse'}
          onclick={() => choisir(site.id)}
          bind:this={boutons[i]}
        >
          <kbd class="touche">{i + 1}</kbd>
          <span>{site.nom_court}</span>
        </button>
      {/each}
    </div>
    {#if phase === 'reponse'}
      <button class="bouton suivant" type="button" bind:this={boutonSuivant} onclick={passer}>
        Suivant <kbd>Entrée</kbd>
      </button>
    {:else}
      <p class="aide">Cliquez sur un nom, ou tapez son numéro.</p>
    {/if}
  {/snippet}
</GabaritRound>

<style>
  .entete {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: var(--trait-fin) solid var(--c-trait);
    padding-bottom: var(--esp-2);
  }
  h2 {
    margin: 0;
    font-weight: var(--graisse-normale);
  }
  .temps {
    font-size: var(--taille-score);
    color: var(--c-accent);
  }
  .choix {
    display: flex;
    flex-direction: column;
    border: var(--trait-fin) solid var(--c-trait);
    background: var(--c-surface);
  }
  .option {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    min-height: var(--hauteur-suggestion);
    padding: 0 var(--esp-4);
    border: 0;
    border-left: var(--trait-fort) solid transparent;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duree-instant);
  }
  .option + .option {
    border-top: var(--trait-fin) solid var(--c-trait);
  }
  .option:hover:not(:disabled) {
    background: var(--c-accent-doux);
    border-left-color: var(--c-accent);
  }
  .option:disabled {
    cursor: default;
    color: var(--c-texte-2);
  }
  .option.juste {
    color: var(--c-succes);
    border-left-color: var(--c-succes);
    font-weight: var(--graisse-forte);
  }
  .option.faux {
    color: var(--c-erreur);
    border-left-color: var(--c-erreur);
    text-decoration: line-through;
    text-decoration-thickness: var(--trait-fort);
  }
  .aide {
    color: var(--c-texte-2);
    font-size: var(--taille-petite);
  }
  .suivant {
    align-self: flex-start;
  }
</style>
