<!--
  Compte rendu d'essai (écran de fin, générique pour tous les modes ; maquette : design/fin-compte-rendu.html).
  Synthèse (total, meilleur score, mesures du mode), « Rejouer » (Entrée), puis le relevé round par
  round : photo, site, réponse du joueur, colonnes du mode, points, et la fiche courte du site avec les
  crédits de la photo. Les fiches des rounds manqués sont dépliées d'office : c'est là qu'on apprend.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formaterReacteurs, formaterSourceFroide } from '../lib/fiche';
  import { deuxChiffres, formaterEntier, pluriel } from '../lib/format';
  import type { ResultatRound } from '../lib/moteur';
  import type { DefinitionMode, RoundPartie } from '../modes/types';
  import { urlPhoto } from '../navigateur/photos';
  import Bandeau from './Bandeau.svelte';
  import Credit from './Credit.svelte';
  import Icone from './Icone.svelte';

  interface Props {
    mode: DefinitionMode;
    rounds: readonly RoundPartie[];
    resultats: readonly ResultatRound[];
    score: number;
    scoreMax: number;
    numeroPartie: number;
    nouveauRecord: boolean;
    /** Meilleur score du mode (après cette partie) ; `null` si le mode n'enregistre pas de score. */
    meilleurScore: number | null;
    onrejouer: () => void;
  }
  let { mode, rounds, resultats, score, scoreMax, numeroPartie, nouveauRecord, meilleurScore, onrejouer }: Props =
    $props();

  // svelte-ignore state_referenced_locally
  let ouverts: boolean[] = $state(resultats.map((r) => r.statut !== 'juste'));
  let titre: HTMLHeadingElement | undefined = $state();
  let affichageMs = 0;
  const mesures = $derived(mode.mesures(resultats).slice(0, 3));
  const colonnes = $derived(mode.colonnesRecap);

  onMount(() => {
    affichageMs = performance.now();
    titre?.focus();
  });

  function touche(e: KeyboardEvent) {
    // Entrée relance une partie, sauf si le focus est sur un autre bouton ou un lien (qui garde son action),
    // et pas dans l'instant qui suit l'affichage (un Entrée appuyé pour la dernière réponse ne doit pas relancer).
    if (e.key !== 'Enter' || e.repeat) return;
    const cible = e.target as HTMLElement | null;
    if (cible?.closest('button, a, input, summary')) return;
    if (performance.now() - affichageMs < mode.antiRebondMs) return;
    e.preventDefault();
    onrejouer();
  }
</script>

<svelte:window onkeydown={touche} />

<div class="page">
  <Bandeau mode={mode.nom}>
    <span class="libelle">
      Essai n°&nbsp;<span class="num">{String(numeroPartie).padStart(4, '0')}</span> · {pluriel(rounds.length, 'round')}
    </span>
  </Bandeau>

  <main class="compte-rendu">
    <section class="synthese" aria-labelledby="titre-resultat">
      <p class="libelle">Compte rendu d'essai</p>
      <h1 id="titre-resultat" tabindex="-1" bind:this={titre}>Résultat</h1>
      <p class="total">
        <span class="valeur num">{formaterEntier(score)}</span>
        <span class="sur num">/&nbsp;{formaterEntier(scoreMax)}</span>
      </p>
      {#if meilleurScore !== null}
        <p class="record">
          {#if nouveauRecord}
            <span class="libelle nouveau">Nouveau record</span>
          {:else}
            Meilleur score&nbsp;: <b class="num">{formaterEntier(meilleurScore)}</b>
          {/if}
        </p>
      {:else}
        <p class="record">Mode en construction&nbsp;: partie non enregistrée.</p>
      {/if}
      {#if mesures.length > 0}
        <dl class="mesures">
          {#each mesures as m (m.libelle)}
            <div>
              <dt class="libelle">{m.libelle}</dt>
              <dd class="num">{m.valeur}</dd>
            </div>
          {/each}
        </dl>
      {/if}
      <div class="actions">
        <button class="bouton" type="button" onclick={onrejouer}>Rejouer <kbd>Entrée</kbd></button>
        <a class="lien" href="#/">Changer de mode</a>
      </div>
    </section>

    <section class="releve" aria-labelledby="titre-releve">
      {#if mode.Recap}
        <mode.Recap {rounds} {resultats} />
      {/if}
      <table>
        <caption class="libelle" id="titre-releve">Relevé round par round</caption>
        <thead>
          <tr>
            <th class="libelle" scope="col">N°</th>
            <th class="libelle col-secondaire" scope="col">Photo</th>
            <th class="libelle" scope="col">Site</th>
            <th class="libelle" scope="col">Votre réponse</th>
            {#each colonnes as c (c.titre)}
              <th class="libelle" class:num={c.numerique} class:col-secondaire={c.secondaire} scope="col">{c.titre}</th>
            {/each}
            <th class="libelle num" scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {#each rounds as round, i (round.photo.id)}
            {@const r = resultats[i]}
            {#if r}
              <tr class:ouvert={ouverts[i]} class:perdu={r.points === 0}>
                <td class="num">{deuxChiffres(i + 1)}</td>
                <td class="col-secondaire">
                  <img class="vignette" src={urlPhoto(round.photo)} alt="" loading="lazy" width="64" height="40" />
                </td>
                <td>
                  <button
                    class="site"
                    type="button"
                    aria-expanded={ouverts[i]}
                    aria-controls="fiche-{i}"
                    onclick={() => (ouverts[i] = !ouverts[i])}
                  >
                    <span class="chevron" aria-hidden="true">{ouverts[i] ? '−' : '+'}</span>
                    {round.site.nom_court}
                  </button>
                </td>
                <td class="reponse {r.statut}">
                  {#if r.statut === 'juste'}<Icone nom="ok" titre="Juste" />{:else if r.statut === 'faux'}<Icone
                      nom="ko"
                      titre="Faux"
                    />{/if}
                  {r.reponse}
                </td>
                {#each colonnes as c (c.titre)}
                  <td class:num={c.numerique} class:col-secondaire={c.secondaire}>{c.valeur(r)}</td>
                {/each}
                <td class="num points">{formaterEntier(r.points)}</td>
              </tr>
              {#if ouverts[i]}
                <tr class="fiche" id="fiche-{i}">
                  <td></td>
                  <td colspan={4 + colonnes.length}>
                    <dl>
                      <dt class="libelle">Site</dt>
                      <dd>{round.site.nom_complet} ({round.site.commune}, {round.site.departement.nom})</dd>
                      <dt class="libelle">Réacteurs</dt>
                      <dd>{formaterReacteurs(round.site)}</dd>
                      <dt class="libelle">Source froide</dt>
                      <dd>{formaterSourceFroide(round.site)}</dd>
                      <dt class="libelle">Anecdote</dt>
                      <dd>{round.site.anecdote}</dd>
                      <dt class="libelle">Photo</dt>
                      <dd><Credit photo={round.photo} /></dd>
                    </dl>
                  </td>
                </tr>
              {/if}
            {/if}
          {/each}
        </tbody>
      </table>
    </section>
  </main>
</div>

<style>
  .compte-rendu {
    display: grid;
    grid-template-columns: var(--largeur-pupitre) minmax(0, 1fr);
    column-gap: var(--esp-6);
    align-items: start;
    padding-bottom: var(--esp-6);
  }
  h1 {
    font-size: var(--taille-titre);
    font-weight: var(--graisse-forte);
    margin-top: var(--esp-1);
  }
  h1:focus {
    outline: none;
  }
  .total {
    margin: var(--esp-5) 0 var(--esp-2);
    display: flex;
    align-items: baseline;
    gap: var(--esp-2);
  }
  .total .valeur {
    font-size: calc(var(--taille-score) * 2);
    font-weight: var(--graisse-forte);
    line-height: 1;
  }
  .total .sur {
    color: var(--c-texte-3);
  }
  .record {
    color: var(--c-texte-2);
    font-size: var(--taille-petite);
  }
  .record b,
  .nouveau {
    color: var(--c-accent);
    font-weight: var(--graisse-forte);
  }
  .mesures {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: var(--trait-fin) solid var(--c-trait);
    border-bottom: var(--trait-fin) solid var(--c-trait);
    margin: var(--esp-5) 0;
  }
  .mesures div {
    padding: var(--esp-3) 0;
  }
  .mesures div + div {
    border-left: var(--trait-fin) solid var(--c-trait);
    padding-left: var(--esp-3);
  }
  .mesures dd {
    margin: 0;
    font-size: var(--taille-score);
    font-weight: var(--graisse-forte);
  }
  .actions {
    display: flex;
    gap: var(--esp-4);
    align-items: center;
    margin-top: var(--esp-5);
  }
  .lien {
    color: var(--c-texte-2);
    font-size: var(--taille-petite);
    text-underline-offset: 0.2em;
  }
  .releve {
    display: grid;
    gap: var(--esp-4);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--taille-petite);
  }
  caption {
    text-align: left;
    padding-bottom: var(--esp-3);
  }
  th {
    text-align: left;
    font-weight: var(--graisse-normale);
    padding: 0 var(--esp-2) var(--esp-2) 0;
    border-bottom: var(--trait-fin) solid var(--c-trait-fort);
  }
  td {
    padding: var(--esp-2) var(--esp-2) var(--esp-2) 0;
    border-bottom: var(--trait-fin) solid var(--c-trait);
    vertical-align: middle;
  }
  td.num,
  th.num {
    text-align: right;
  }
  .vignette {
    width: 4rem;
    height: 2.5rem;
    object-fit: cover;
    display: block;
    background: var(--c-surface-2);
  }
  .site {
    display: inline-flex;
    align-items: baseline;
    gap: var(--esp-2);
    padding: 0;
    border: 0;
    background: none;
    font-size: var(--taille-base);
    font-weight: var(--graisse-forte);
    cursor: pointer;
    text-align: left;
  }
  .chevron {
    font-family: var(--police-chiffres);
    color: var(--c-texte-3);
    width: 1ch;
  }
  .reponse.juste {
    color: var(--c-succes);
  }
  .reponse.faux {
    color: var(--c-erreur);
  }
  tr.perdu .points {
    color: var(--c-texte-3);
  }
  tr.ouvert td {
    border-bottom: 0;
    background: var(--c-surface);
  }
  tr.fiche td {
    background: var(--c-surface);
    padding: 0 var(--esp-4) var(--esp-4) 0;
  }
  .fiche dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--esp-1) var(--esp-4);
    margin: 0;
  }
  .fiche dd {
    margin: 0;
    color: var(--c-texte-2);
  }
  @media (max-width: 719px) {
    .compte-rendu {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--esp-5);
    }
    .total .valeur {
      font-size: calc(var(--taille-score) * 1.6);
    }
    .actions .bouton {
      flex: 1;
      justify-content: center;
    }
    .col-secondaire {
      display: none;
    }
    .fiche dl {
      grid-template-columns: 1fr;
    }
  }
</style>
