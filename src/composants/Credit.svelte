<!--
  Crédit d'une photo : auteur, licence, lien vers l'original.
  À n'afficher qu'APRÈS le round (le lien source contient souvent le nom du site).
-->
<script lang="ts">
  import type { Photo } from '../lib/types';

  let { photo }: { photo: Photo } = $props();

  const LICENCES: Record<string, string> = {
    'image-generee': 'image de test générée',
    'domaine-public': 'domaine public',
    'accord-auteur': 'avec l’accord de l’auteur',
    'droits-reserves': 'droits réservés',
    'Etalab-2.0': 'Licence Ouverte Etalab 2.0',
  };
  const licence = $derived(
    LICENCES[photo.licence] ?? photo.licence.replaceAll('-', ' ').replace('CC BY SA', 'CC BY-SA'),
  );
</script>

{#if photo.substitut}
  <span>Photo de substitution (image de test)</span>
{:else}
  <span>Photo&nbsp;: {photo.auteur}, {licence}</span>{#if photo.url_source}
    · <a href={photo.url_source} target="_blank" rel="noopener noreferrer">source</a>{/if}
{/if}

<style>
  a {
    color: inherit;
    text-underline-offset: 0.2em;
  }
</style>
