<!--
  Une partie d'un mode, du premier round au compte rendu, puis « Rejouer ».

  Ce composant fait le lien entre le moteur générique (src/lib/moteur.ts), le mode (son composant
  `Round` et ses règles) et le navigateur : préchargement, écran « réponse » entre deux rounds
  (délai du mode, `Entrée` ou tap après l'anti-rebond), persistance, titre de la page.
-->
<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { profil } from '../etat/profil.svelte';
  import { preparerPartie, prendrePartiePreparee } from '../etat/preparation';
  import { SITES } from '../lib/donnees';
  import { deuxChiffres, formaterEntier } from '../lib/format';
  import {
    creerPartie,
    enregistrerResultat,
    passerAuRoundSuivant,
    resultatCourant,
    roundCourant,
    scoreTotal,
    type Partie,
    type ResultatRound,
  } from '../lib/moteur';
  import type { DefinitionMode, RoundPartie } from '../modes/types';
  import { prechargerRounds } from '../navigateur/photos';
  import Bandeau from './Bandeau.svelte';
  import Icone from './Icone.svelte';
  import Resultats from './Resultats.svelte';

  let { mode }: { mode: DefinitionMode } = $props();

  let partie: Partie<RoundPartie> = $state.raw(untrack(() => creerPartie(prendrePartiePreparee(mode))));
  let numeroPartie = $state(0);
  /** Lancement de la partie : sert de clé pour recréer les composants au « Rejouer ». */
  let lancement = $state(0);
  let finRound = 0;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let bilan = $state({ nouveauRecord: false, ancienRecord: 0 });

  const round = $derived(roundCourant(partie));
  const resultat = $derived(resultatCourant(partie));
  const score = $derived(scoreTotal(partie));
  const scoreMax = $derived(partie.rounds.length * mode.scoreMaxRound);

  function demarrer(rounds: RoundPartie[]) {
    clearTimeout(minuteur);
    partie = creerPartie(rounds);
    lancement += 1;
    numeroPartie = profil.commencerPartie();
    debutRound();
  }

  function debutRound() {
    profil.marquerVue(roundCourant(partie).photo.id, numeroPartie);
    prechargerRounds(partie.rounds, partie.index);
  }

  /** Appelé par le mode à la fin d'un round. */
  function terminer(r: ResultatRound) {
    if (partie.etat !== 'en_cours') return;
    partie = enregistrerResultat(partie, r);
    finRound = performance.now();
    const delai = mode.delaiReponseMs(r);
    if (delai !== null) minuteur = setTimeout(suivant, delai);
  }

  /** Fin de l'écran réponse. */
  function suivant() {
    if (partie.etat !== 'reponse') return;
    clearTimeout(minuteur);
    partie = passerAuRoundSuivant(partie);
    if (partie.etat === 'terminee') finPartie();
    else debutRound();
  }

  /** `Entrée`, tap ou bouton du mode : seulement après l'anti-rebond (évite qu'un double appui saute la réponse). */
  function passerSiPermis() {
    if (partie.etat === 'reponse' && performance.now() - finRound >= mode.antiRebondMs) suivant();
  }

  function finPartie() {
    bilan = mode.enConstruction
      ? { nouveauRecord: false, ancienRecord: profil.donnees.modes[mode.id]?.meilleurScore ?? 0 }
      : profil.terminerPartie(mode.id, scoreTotal(partie));
    // Prochaine partie tirée et préchargée tout de suite : « Rejouer » est instantané.
    preparerPartie(mode);
  }

  function rejouer() {
    demarrer(prendrePartiePreparee(mode));
  }

  function touche(e: KeyboardEvent) {
    if (e.key === 'Enter' && partie.etat === 'reponse' && !e.repeat) {
      e.preventDefault();
      passerSiPermis();
    }
  }

  function tap() {
    if (mode.passerAuTap) passerSiPermis();
  }

  onMount(() => {
    numeroPartie = profil.commencerPartie();
    debutRound();
  });
  onDestroy(() => clearTimeout(minuteur));

  $effect(() => {
    document.title =
      partie.etat === 'terminee'
        ? `Compte rendu · ${mode.nom} — NucGuessr`
        : `${mode.nom} · round ${partie.index + 1}/${partie.rounds.length} — NucGuessr`;
  });
</script>

<svelte:window onkeydown={touche} />

{#if partie.etat === 'terminee'}
  {#key lancement}
    <Resultats
      {mode}
      rounds={partie.rounds}
      resultats={partie.resultats}
      {score}
      {scoreMax}
      {numeroPartie}
      nouveauRecord={bilan.nouveauRecord}
      meilleurScore={mode.enConstruction ? null : (profil.donnees.modes[mode.id]?.meilleurScore ?? score)}
      onrejouer={rejouer}
    />
  {/key}
{:else}
  <div class="page jeu">
    <Bandeau mode={mode.nom}>
      <div class="voyants">
        <span class="libelle">Round</span>
        <span class="num" aria-live="polite">
          {deuxChiffres(partie.index + 1)}/{deuxChiffres(partie.rounds.length)}
        </span>
        <ol aria-hidden="true">
          {#each partie.rounds as _, i (i)}
            {@const r = partie.resultats[i]}
            <li class={r ? r.statut : i === partie.index ? 'encours' : ''}>
              {#if r?.statut === 'faux'}<Icone nom="ko" />{/if}
            </li>
          {/each}
        </ol>
      </div>
      <div class="score">
        <span class="libelle">Score</span>
        <span class="valeur num">{formaterEntier(score)}</span>
        <span class="sur num">/&nbsp;{formaterEntier(scoreMax)}</span>
      </div>
    </Bandeau>

    <!-- Le tap n'importe où dans la zone du round passe la réponse (si le mode l'autorise) ; au clavier : Entrée. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <main class="zone-round" onclick={tap}>
      <h1 class="visuellement-masque">{mode.nom}, round {partie.index + 1} sur {partie.rounds.length}</h1>
      {#key `${lancement}-${partie.index}`}
        <mode.Round
          {round}
          numero={partie.index + 1}
          total={partie.rounds.length}
          phase={partie.etat === 'reponse' ? 'reponse' : 'jeu'}
          {resultat}
          sites={SITES}
          aleatoire={Math.random}
          {terminer}
          passer={passerSiPermis}
        />
      {/key}
    </main>
  </div>
{/if}

<style>
  .jeu {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    padding-bottom: var(--esp-5);
  }
  .zone-round {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .voyants {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
  }
  .voyants ol {
    display: flex;
    gap: var(--esp-1);
    list-style: none;
    margin: 0 0 0 var(--esp-2);
    padding: 0;
  }
  .voyants li {
    width: 0.75rem;
    height: 0.75rem;
    border: var(--trait-fin) solid var(--c-trait-fort);
    display: grid;
    place-items: center;
    color: var(--c-erreur);
    font-size: 0.55rem;
  }
  .voyants li.juste {
    background: var(--c-succes);
    border-color: var(--c-succes);
  }
  .voyants li.neutre {
    background: var(--c-texte-3);
    border-color: var(--c-texte-3);
  }
  .voyants li.faux {
    border-color: var(--c-erreur);
  }
  .voyants li.encours {
    border: var(--trait-fort) solid var(--c-accent);
  }
  .score {
    display: flex;
    align-items: baseline;
    gap: var(--esp-2);
    padding-left: var(--esp-5);
    border-left: var(--trait-fin) solid var(--c-trait);
  }
  .score .valeur {
    font-size: var(--taille-score);
    font-weight: var(--graisse-forte);
  }
  .score .sur {
    color: var(--c-texte-3);
    font-size: var(--taille-petite);
  }
  @media (max-width: 719px) {
    .jeu {
      padding-bottom: var(--esp-2);
    }
    .voyants ol,
    .score .sur {
      display: none;
    }
    .score {
      padding-left: var(--esp-3);
    }
    .score .valeur {
      font-size: var(--taille-base);
    }
  }
</style>
