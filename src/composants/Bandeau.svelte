<!--
  Bandeau d'instrumentation en haut de chaque écran : wordmark (lien vers l'accueil), libellé du mode,
  puis, à droite, le contenu propre à l'écran (round et voyants, score, numéro d'essai…).
  Une ligne, filet en bas, rien de centré.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import wordmark from '../assets/wordmark.svg';

  let { mode = '', children }: { mode?: string; children?: Snippet } = $props();
</script>

<header class="bandeau">
  <a class="marque" href="#/" aria-label="NucGuessr, retour à l'accueil">
    <img src={wordmark} alt="" width="158" height="32" />
  </a>
  {#if mode}<span class="libelle mode">{mode}</span>{/if}
  <div class="droite">{@render children?.()}</div>
</header>

<style>
  .bandeau {
    display: flex;
    align-items: center;
    gap: var(--esp-5);
    min-height: var(--hauteur-bandeau);
    border-bottom: var(--trait-fin) solid var(--c-trait);
    margin-bottom: var(--esp-4);
  }
  .marque {
    display: block;
    line-height: 0;
  }
  .marque img {
    height: 1.25rem;
    width: auto;
  }
  .mode {
    padding-left: var(--esp-4);
    border-left: var(--trait-fin) solid var(--c-trait);
  }
  .droite {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--esp-5);
  }
  @media (max-width: 719px) {
    .bandeau {
      min-height: var(--hauteur-bandeau-mobile);
      gap: var(--esp-3);
      margin-bottom: var(--esp-2);
    }
    .marque img {
      height: 1rem;
    }
    .mode {
      display: none;
    }
    .droite {
      gap: var(--esp-3);
    }
  }
</style>
