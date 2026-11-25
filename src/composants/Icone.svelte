<!--
  Icônes de statut dessinées en SVG (jamais d'emoji) : ✓ juste, ✕ faux.
  La couleur vient du parent (`currentColor`) ; l'icône double toujours la couleur (daltonisme).
-->
<script lang="ts">
  let { nom, titre }: { nom: 'ok' | 'ko'; titre?: string } = $props();
</script>

<svg class="icone" viewBox="0 0 16 16" aria-hidden={titre ? undefined : 'true'} role={titre ? 'img' : undefined}>
  {#if titre}<title>{titre}</title>{/if}
  {#if nom === 'ok'}
    <path d="M2.5 8.5l3.5 3.5 7.5-8" />
  {:else}
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  {/if}
</svg>

<style>
  .icone {
    width: 1em;
    height: 1em;
    flex: none;
    stroke: currentColor;
    stroke-width: 2.2;
    fill: none;
    stroke-linecap: square;
    vertical-align: -0.125em;
  }
</style>
