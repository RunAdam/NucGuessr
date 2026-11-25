<!--
  Écran d'accueil : choix du mode (Rapidité présélectionné), lancement, relevé des meilleurs scores.
  Clavier : ↑ / ↓ changent de mode, Entrée lance la partie.
  La partie du mode sélectionné est tirée et ses premières photos préchargées dès cet écran.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { NB_SITES_V1 } from '../config';
  import { profil } from '../etat/profil.svelte';
  import { preparerPartie } from '../etat/preparation';
  import { formaterEntier } from '../lib/format';
  import type { DefinitionMode } from '../modes/types';
  import Bandeau from './Bandeau.svelte';

  interface Props {
    modes: readonly DefinitionMode[];
    /** Mode présélectionné. */
    initial: DefinitionMode;
    onlancer: (mode: DefinitionMode) => void;
    /** Le joueur change de mode (pour le retrouver présélectionné en revenant à l'accueil). */
    onchoisir?: (mode: DefinitionMode) => void;
  }
  let { modes, initial, onlancer, onchoisir }: Props = $props();

  // svelte-ignore state_referenced_locally
  let choisi: string = $state(initial.id);
  const mode = $derived(modes.find((m) => m.id === choisi) ?? initial);
  let radios: HTMLInputElement[] = $state([]);

  // Tirage et préchargement de la partie du mode sélectionné, dès qu'il change.
  // (untrack : relire le profil pendant le tirage ne doit pas relancer un tirage.)
  $effect(() => {
    const m = mode;
    untrack(() => preparerPartie(m));
  });

  onMount(() => {
    radios.find((r) => r.checked)?.focus();
  });

  function selectionner(id: string) {
    choisi = id;
    onchoisir?.(mode);
  }

  function lancer(e: SubmitEvent) {
    e.preventDefault();
    onlancer(mode);
  }

  function touche(e: KeyboardEvent) {
    // Entrée sur un bouton radio ne soumet pas toujours le formulaire : on le fait nous-mêmes.
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      onlancer(mode);
    }
  }

  const stats = (id: string) => profil.donnees.modes[id];
</script>

<div class="page">
  <Bandeau>
    <span class="libelle">Parties jouées</span>
    <span class="num">{formaterEntier(Object.values(profil.donnees.modes).reduce((s, m) => s + m.parties, 0))}</span>
  </Bandeau>

  <main class="accueil">
    <section class="presentation" aria-labelledby="titre-accueil">
      <p class="libelle">Identification de site · {NB_SITES_V1} centrales en exploitation</p>
      <h1 id="titre-accueil">Une photo, une centrale nucléaire française. Laquelle&nbsp;?</h1>
      <p class="texte-2">
        Chaque centrale n'apparaît qu'une fois par partie, et le jeu vous montre en priorité les photos que vous n'avez
        pas encore vues.
      </p>
    </section>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Entrée sur un bouton radio : lancer) -->
    <form class="selecteur" onsubmit={lancer} onkeydown={touche}>
      <fieldset>
        <legend class="libelle">Mode de jeu</legend>
        {#each modes as m, i (m.id)}
          {@const s = stats(m.id)}
          <label class="canal" class:actif={m.id === choisi}>
            <input
              type="radio"
              name="mode"
              value={m.id}
              checked={m.id === choisi}
              bind:this={radios[i]}
              onchange={() => selectionner(m.id)}
            />
            <span class="voyant" aria-hidden="true"></span>
            <span class="nom">{m.nom}</span>
            <span class="resume">{m.resume}</span>
            <span class="etat">
              {#if m.enConstruction}
                <span class="etiquette">En construction</span>
              {:else if m.demonstration}
                <span class="etiquette">Démonstration</span>
              {:else if s && s.parties > 0}
                <span class="libelle">Meilleur</span> <span class="num record">{formaterEntier(s.meilleurScore)}</span>
              {/if}
            </span>
          </label>
        {/each}
      </fieldset>
      <button class="bouton" type="submit">
        Lancer · {mode.nom} <kbd>Entrée</kbd>
      </button>
    </form>

    <aside class="releves" aria-labelledby="titre-releves">
      <h2 class="libelle" id="titre-releves">Relevés</h2>
      <table>
        <thead>
          <tr>
            <th class="libelle">Mode</th><th class="libelle num">Parties</th><th class="libelle num">Meilleur</th>
          </tr>
        </thead>
        <tbody>
          {#each modes as m (m.id)}
            {@const s = stats(m.id)}
            <tr>
              <td>{m.nom}</td>
              <td class="num">{formaterEntier(s?.parties ?? 0)}</td>
              <td class="num">{s && s.parties > 0 ? formaterEntier(s.meilleurScore) : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if !profil.persistant}
        <p class="avertissement">
          Votre navigateur n'autorise pas l'enregistrement local&nbsp;: scores et photos vues seront oubliés en quittant
          la page.
        </p>
      {/if}
    </aside>
  </main>

  <footer class="pied">
    Projet étudiant (promo d'ingénierie nucléaire), sans lien avec EDF, Orano, le CEA ou l'ASNR.
  </footer>
</div>

<style>
  .accueil {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--largeur-pupitre);
    grid-template-areas: 'presentation releves' 'selecteur releves';
    align-content: start;
    gap: var(--esp-6) var(--esp-7);
    padding-top: var(--esp-5);
  }
  .presentation {
    grid-area: presentation;
    max-width: 40rem;
    display: grid;
    gap: var(--esp-3);
  }
  h1 {
    font-size: var(--taille-titre);
    font-weight: var(--graisse-forte);
    line-height: 1.25;
  }
  .texte-2 {
    color: var(--c-texte-2);
  }
  .selecteur {
    grid-area: selecteur;
    display: grid;
    gap: var(--esp-5);
    justify-items: start;
    max-width: 48rem;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    width: 100%;
    border-top: var(--trait-fin) solid var(--c-trait-fort);
  }
  legend {
    padding: 0 0 var(--esp-2);
    float: left;
    width: 100%;
  }
  .canal {
    clear: both;
    display: grid;
    grid-template-columns: auto 9rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--esp-4);
    min-height: var(--hauteur-saisie);
    padding: 0 var(--esp-4);
    border-bottom: var(--trait-fin) solid var(--c-trait);
    border-left: var(--trait-fort) solid transparent;
    cursor: pointer;
    transition: background-color var(--duree-instant);
  }
  .canal:hover {
    background: var(--c-surface);
  }
  .canal.actif {
    background: var(--c-accent-doux);
    border-left-color: var(--c-accent);
  }
  .canal:has(input:focus-visible) {
    box-shadow: var(--halo-focus);
  }
  /* Le bouton radio natif reste dans le DOM (clavier, lecteurs d'écran) mais c'est le voyant qui se voit. */
  .canal input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .voyant {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--rayon-rond);
    border: var(--trait-fin) solid var(--c-trait-fort);
  }
  .actif .voyant {
    background: var(--c-accent);
    border-color: var(--c-accent);
  }
  .nom {
    font-weight: var(--graisse-forte);
  }
  .resume {
    color: var(--c-texte-2);
    font-size: var(--taille-petite);
  }
  .etat {
    display: flex;
    align-items: baseline;
    gap: var(--esp-2);
    white-space: nowrap;
  }
  .record {
    color: var(--c-accent);
  }
  .etiquette {
    font-family: var(--police-chiffres);
    font-size: var(--taille-micro);
    text-transform: uppercase;
    letter-spacing: var(--interlettre-libelle);
    color: var(--c-texte-3);
    border: var(--trait-fin) solid var(--c-trait-fort);
    border-radius: var(--rayon-1);
    padding: 0 var(--esp-1);
  }
  .releves {
    grid-area: releves;
    border-left: var(--trait-fin) solid var(--c-trait);
    padding-left: var(--esp-5);
    display: grid;
    gap: var(--esp-3);
    align-content: start;
  }
  .releves h2 {
    font-weight: var(--graisse-normale);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--taille-petite);
  }
  th {
    text-align: left;
    font-weight: var(--graisse-normale);
    padding: 0 0 var(--esp-2);
    border-bottom: var(--trait-fin) solid var(--c-trait-fort);
  }
  td {
    padding: var(--esp-2) 0;
    border-bottom: var(--trait-fin) solid var(--c-trait);
  }
  th.num,
  td.num {
    text-align: right;
  }
  .avertissement {
    font-size: var(--taille-petite);
    color: var(--c-texte-2);
  }
  .pied {
    margin-top: var(--esp-7);
    padding: var(--esp-3) 0;
    border-top: var(--trait-fin) solid var(--c-trait);
    font-size: var(--taille-petite);
    color: var(--c-texte-3);
  }
  @media (max-width: 719px) {
    .accueil {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'presentation' 'selecteur' 'releves';
      gap: var(--esp-5);
      padding-top: var(--esp-2);
    }
    .canal {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: 'voyant nom etat' 'voyant resume resume';
      row-gap: 0;
      padding: var(--esp-2) var(--esp-3);
    }
    .voyant {
      grid-area: voyant;
    }
    .nom {
      grid-area: nom;
    }
    .resume {
      grid-area: resume;
    }
    .etat {
      grid-area: etat;
    }
    .selecteur .bouton {
      width: 100%;
      justify-content: center;
    }
    .releves {
      border-left: 0;
      padding-left: 0;
    }
  }
</style>
