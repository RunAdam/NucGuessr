<!--
  Écran d'un round du mode Distance : la photo, la carte de France (zoom, déplacement, repère) et le pupitre
  (consigne, « Valider », puis la fiche du site et « Suivant »).

  Bureau (≥ 720 px) : photo et pupitre à gauche, carte à droite, côte à côte.
  Mobile : photo réduite en haut (un bouton l'agrandit par-dessus la carte, sans changer la carte ni son zoom),
  carte au milieu, pupitre en bas. Décision et tests : docs/DECISIONS.md, phase 6.
-->
<script lang="ts">
  import { DISTANCE_RAYON_PARFAIT_KM, scoreDistance } from '../../config';
  import BandeReponse from '../../composants/BandeReponse.svelte';
  import PhotoRound from '../../composants/PhotoRound.svelte';
  import { formaterReacteurs, formaterSourceFroide } from '../../lib/fiche';
  import { deuxChiffres } from '../../lib/format';
  import type { PropsRound } from '../types';
  import { chargerCarte } from './chargement';
  import { decrireRepere, distanceKm, formaterDistance, type LatLon, type Paire } from './geo';
  import type { DetailDistance } from './index';

  let { round, numero, phase, resultat, sites, terminer, passer }: PropsRound<DetailDistance> = $props();

  let repere: LatLon | null = $state(null);
  let photoVisible = $state(false);
  let photoAgrandie = $state(false);
  let valide = false;
  let boutonSuivant: HTMLButtonElement | undefined = $state();
  let zoneCarte: HTMLDivElement | undefined = $state();
  let carte = $state(chargerCarte());

  const reponse: LatLon = $derived({ lat: round.site.lat, lon: round.site.lon });

  // La position réelle n'est donnée à la carte qu'en phase réponse.
  const paires: Paire[] = $derived(
    phase === 'reponse' && resultat
      ? [{ proposition: resultat.detail.repere, reponse, distanceKm: resultat.detail.distanceKm }]
      : [],
  );

  function poser(p: LatLon) {
    if (phase !== 'jeu') return;
    repere = p;
  }

  function valider() {
    if (phase !== 'jeu' || !repere || valide) return;
    valide = true;
    photoAgrandie = false;
    const d = distanceKm(repere, reponse);
    terminer({
      points: scoreDistance(d),
      statut: d <= DISTANCE_RAYON_PARFAIT_KM ? 'juste' : 'neutre',
      reponse: decrireRepere(repere, sites),
      detail: { repere, distanceKm: d },
    });
  }

  function surPhotoVisible() {
    photoVisible = true;
    zoneCarte?.querySelector<SVGSVGElement>('svg[role="application"]')?.focus({ preventScroll: true });
  }

  $effect(() => {
    if (phase === 'reponse') boutonSuivant?.focus({ preventScroll: true });
  });

  function touche(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.repeat || phase !== 'jeu') return;
    // Entrée sur un autre bouton (zoom, agrandir la photo) garde l'action de ce bouton.
    const cible = e.target as HTMLElement | null;
    if (cible?.closest('button:not(.valider), a')) return;
    if (!repere) return;
    e.preventDefault();
    valider();
  }
</script>

<svelte:window onkeydown={touche} />

<div class="round" class:agrandie={photoAgrandie}>
  <div class="zone-photo">
    <PhotoRound
      photo={round.photo}
      legende="Vue {deuxChiffres(numero)}"
      revele={phase === 'reponse'}
      onvisible={surPhotoVisible}
    >
      {#if phase === 'reponse' && resultat}
        <BandeReponse
          statut={resultat.statut}
          nom={round.site.nom_court}
          detail={resultat.statut === 'juste'
            ? `${formaterDistance(resultat.detail.distanceKm)} · dans le mille`
            : formaterDistance(resultat.detail.distanceKm)}
          points={resultat.points}
        />
      {/if}
    </PhotoRound>
    <button
      type="button"
      class="bascule libelle"
      aria-pressed={photoAgrandie}
      aria-label="Agrandir la photo"
      onclick={() => (photoAgrandie = !photoAgrandie)}
    >
      {photoAgrandie ? 'Réduire' : 'Agrandir'}
    </button>
  </div>

  <div class="zone-carte" bind:this={zoneCarte}>
    {#await carte}
      <p class="attente libelle" role="status">Chargement de la carte…</p>
    {:then Carte}
      <Carte
        {repere}
        interactif={phase === 'jeu'}
        onposer={poser}
        {paires}
        libelle="Carte de France. Touchez ou cliquez pour placer votre repère ; molette, pincement ou boutons pour zoomer ; glisser pour déplacer. Au clavier : flèches, plus et moins, Espace pour poser le repère au centre."
      />
    {:catch}
      <div class="attente" role="alert">
        <p>La carte n'a pas pu être chargée.</p>
        <button class="bouton-discret" type="button" onclick={() => (carte = chargerCarte())}>Réessayer</button>
      </div>
    {/await}
  </div>

  <div class="pupitre">
    {#if phase === 'jeu'}
      <p class="aide" aria-live="polite">
        {#if !photoVisible}
          Réception de l'image…
        {:else if repere}
          Repère posé. Déplacez-le si besoin, puis validez.
        {:else}
          Où est cette centrale&nbsp;? Zoomez, puis touchez la carte pour poser votre repère.
        {/if}
      </p>
      <button class="bouton valider" type="button" disabled={!repere} onclick={valider}>
        Valider <kbd>Entrée</kbd>
      </button>
    {:else if resultat}
      <dl class="fiche">
        <dt class="libelle">Site</dt>
        <dd>{round.site.nom_complet}</dd>
        <dt class="libelle">Réacteurs</dt>
        <dd>{formaterReacteurs(round.site)}</dd>
        <dt class="libelle">Source froide</dt>
        <dd>{formaterSourceFroide(round.site)}</dd>
      </dl>
      <button class="bouton" type="button" bind:this={boutonSuivant} onclick={passer}>
        Suivant <kbd>Entrée</kbd>
      </button>
    {/if}
  </div>
</div>

<style>
  .round {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas: 'photo carte' 'pupitre carte';
    gap: var(--esp-4) var(--esp-5);
  }
  .zone-photo {
    grid-area: photo;
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .zone-photo > :global(.ecran) {
    flex: 1;
  }
  .zone-carte {
    grid-area: carte;
    position: relative;
    min-height: 0;
    display: flex;
  }
  .pupitre {
    grid-area: pupitre;
    display: flex;
    flex-direction: column;
    gap: var(--esp-3);
    align-items: flex-start;
    padding-top: var(--esp-3);
    border-top: var(--trait-fin) solid var(--c-trait);
  }
  .aide {
    color: var(--c-texte-2);
    font-size: var(--taille-petite);
    min-height: 2lh;
  }
  .fiche {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--esp-1) var(--esp-4);
    margin: 0;
    font-size: var(--taille-petite);
  }
  .fiche dt {
    align-self: baseline;
  }
  .fiche dd {
    margin: 0;
    color: var(--c-texte-2);
  }
  .attente {
    margin: auto;
    display: grid;
    justify-items: center;
    gap: var(--esp-3);
    color: var(--c-texte-2);
  }
  .bascule {
    display: none;
  }

  /* Mobile : photo réduite en haut, carte, pupitre ; la photo s'agrandit par-dessus la carte. */
  @media (max-width: 719px) {
    .round {
      position: relative;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(7rem, 30%) minmax(0, 1fr) auto;
      grid-template-areas: 'photo' 'carte' 'pupitre';
      gap: var(--esp-2);
    }
    .agrandie .zone-photo {
      /* Hors de la grille : la carte garde sa taille et son zoom. */
      grid-area: auto;
      position: absolute;
      inset: 0 0 auto 0;
      height: 100%;
      z-index: 5;
      background: var(--c-fond);
    }
    /* Photo agrandie : entière (sans recadrage), sur toute la largeur. */
    .agrandie .zone-photo :global(.ecran img) {
      object-fit: contain;
    }
    .bascule {
      display: block;
      position: absolute;
      top: var(--esp-1);
      left: var(--esp-1);
      z-index: 4;
      min-height: 2rem;
      padding: 0 var(--esp-2);
      border: var(--trait-fin) solid var(--c-trait-fort);
      border-radius: var(--rayon-1);
      background: var(--c-fond);
      color: var(--c-texte);
      cursor: pointer;
    }
    .pupitre {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      padding-top: var(--esp-2);
      gap: var(--esp-2);
    }
    .aide {
      flex: 1 1 10rem;
      min-height: 0;
    }
    .pupitre .bouton {
      flex: 1 0 auto;
      justify-content: center;
    }
    .fiche {
      flex: 1 1 100%;
      font-size: var(--taille-micro);
      gap: 0 var(--esp-3);
    }
    .fiche dd {
      font-size: var(--taille-petite);
    }
  }
</style>
