<!--
  Photo d'un round, cadrée comme un moniteur (direction « Synoptique »).

  - Pendant le chargement : fond neutre et indicateur ; la photo n'apparaît qu'entière et décodée.
  - `onvisible` est appelé UNE fois, quand la photo est réellement peinte à l'écran : c'est le signal
    de départ du chronomètre (décision 2.2 : le joueur n'est jamais pénalisé par sa connexion).
  - Anti-triche : pendant le jeu, seul l'`alt` neutre de la photo est exposé ; les crédits (auteur,
    licence, lien source, qui contient souvent le nom du site) n'apparaissent que si `revele` est vrai.
  - `children` : contenu posé en bas de la photo (bande de réponse, essais…).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Photo } from '../lib/types';
  import { attendreDecodage, attendrePeinture, urlPhoto } from '../navigateur/photos';
  import Credit from './Credit.svelte';

  interface Props {
    photo: Photo;
    /** Afficher les crédits de la photo (seulement après le round). */
    revele?: boolean;
    /** Légende de canal en haut à gauche (« Vue 03 »). */
    legende?: string;
    /** Appelé une fois, quand la photo est affichée. */
    onvisible?: () => void;
    children?: Snippet;
  }

  let { photo, revele = false, legende = '', onvisible, children }: Props = $props();

  let img: HTMLImageElement | undefined = $state();
  let etat: 'chargement' | 'visible' | 'erreur' = $state('chargement');
  let essai = $state(0);

  $effect(() => {
    const element = img;
    void essai;
    if (!element) return;
    let annule = false;
    etat = 'chargement';
    attendreDecodage(element).then(async (ok) => {
      if (annule) return;
      if (!ok) {
        etat = 'erreur';
        return;
      }
      etat = 'visible';
      await attendrePeinture();
      if (!annule) onvisible?.();
    });
    return () => {
      annule = true;
    };
  });
</script>

<figure class="ecran" data-etat={etat}>
  <div class="cadre">
    {#key essai}
      <img
        bind:this={img}
        src={urlPhoto(photo)}
        alt={photo.alt}
        width={photo.largeur}
        height={photo.hauteur}
        decoding="async"
        fetchpriority="high"
      />
    {/key}
    {#if etat === 'chargement'}
      <p class="attente libelle" role="status">Réception de l'image…</p>
    {:else if etat === 'erreur'}
      <div class="attente" role="alert">
        <p>La photo n'a pas pu être chargée.</p>
        <button class="bouton-discret" type="button" onclick={() => essai++}>Réessayer</button>
      </div>
    {/if}
  </div>
  {#if legende}<span class="canal libelle">{legende}</span>{/if}
  {#if revele}
    <figcaption class="credit"><Credit {photo} /></figcaption>
  {/if}
  {@render children?.()}
</figure>

<style>
  .ecran {
    position: relative;
    margin: 0;
    min-height: 0;
    display: flex;
  }
  /* Repères d'angle du moniteur */
  .ecran::before,
  .ecran::after {
    content: '';
    position: absolute;
    width: 1.25rem;
    height: 1.25rem;
    z-index: 2;
    pointer-events: none;
    border: 0 solid var(--c-texte-2);
  }
  .ecran::before {
    top: calc(var(--esp-2) * -0.75);
    left: calc(var(--esp-2) * -0.75);
    border-top-width: var(--trait-fin);
    border-left-width: var(--trait-fin);
  }
  .ecran::after {
    bottom: calc(var(--esp-2) * -0.75);
    right: calc(var(--esp-2) * -0.75);
    border-bottom-width: var(--trait-fin);
    border-right-width: var(--trait-fin);
  }
  .cadre {
    position: relative;
    flex: 1;
    min-height: 0;
    background: var(--c-surface);
    overflow: hidden;
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    /* Pas de fondu : la photo apparaît d'un coup, au moment où le chronomètre démarre. */
    visibility: hidden;
  }
  [data-etat='visible'] img {
    visibility: visible;
  }
  .attente {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--esp-3);
    margin: 0;
    color: var(--c-texte-2);
  }
  .canal {
    position: absolute;
    top: var(--esp-2);
    left: var(--esp-3);
    z-index: 2;
    background: var(--c-fond);
    padding: 0 var(--esp-1);
  }
  .credit {
    position: absolute;
    top: var(--esp-2);
    right: var(--esp-3);
    z-index: 2;
    max-width: 60%;
    font-size: var(--taille-micro);
    color: var(--c-texte-2);
    background: var(--c-fond);
    padding: 0 var(--esp-1);
  }
  @media (max-width: 719px) {
    .ecran::before,
    .ecran::after,
    .canal {
      display: none;
    }
  }
</style>
