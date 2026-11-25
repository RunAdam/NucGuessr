<!--
  Bande de réponse posée en bas de la photo pendant l'écran « réponse » (direction « Synoptique ») :
  icône de statut, nom du site, détail du round, points. Monte depuis le bas (--duree-revelation,
  à zéro si `prefers-reduced-motion`).
-->
<script lang="ts">
  import { formaterEntier } from '../lib/format';
  import type { StatutRound } from '../lib/moteur';
  import Icone from './Icone.svelte';

  interface Props {
    statut: StatutRound;
    /** Nom du site (la bonne réponse). */
    nom: string;
    /** Détail court (« 6,4 s · 1 erreur », « Temps écoulé : c'était ce site. »). */
    detail?: string;
    points: number;
  }
  let { statut, nom, detail = '', points }: Props = $props();
</script>

<div class="bande {statut}" role="status">
  {#if statut === 'juste'}<Icone nom="ok" titre="Juste" />{:else if statut === 'faux'}<Icone
      nom="ko"
      titre="Faux"
    />{/if}
  <span class="nom">{nom}</span>
  {#if detail}<span class="detail">{detail}</span>{/if}
  <span class="points num">+{formaterEntier(points)}</span>
</div>

<style>
  .bande {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    padding: var(--esp-3) var(--esp-4);
    background: var(--c-fond);
    border-top: var(--trait-fort) solid var(--c-trait-fort);
    animation: monte var(--duree-revelation) var(--courbe-sortie);
    font-size: var(--taille-titre);
  }
  .bande.juste {
    border-top-color: var(--c-succes);
    color: var(--c-succes);
  }
  .bande.faux {
    border-top-color: var(--c-erreur);
    color: var(--c-erreur);
  }
  .nom {
    font-weight: var(--graisse-forte);
    color: var(--c-texte);
  }
  .detail {
    margin-left: auto;
    color: var(--c-texte-2);
    font-size: var(--taille-base);
  }
  .points {
    font-weight: var(--graisse-forte);
    margin-left: var(--esp-3);
  }
  .bande.neutre .points {
    color: var(--c-texte);
  }
  @keyframes monte {
    from {
      transform: translateY(100%);
    }
  }
  @media (max-width: 719px) {
    .bande {
      padding: var(--esp-2) var(--esp-3);
      flex-wrap: wrap;
      gap: 0 var(--esp-2);
      font-size: var(--taille-base);
    }
    .detail {
      margin-left: 0;
      width: 100%;
      order: 3;
      font-size: var(--taille-petite);
    }
    .points {
      margin-left: auto;
    }
  }
</style>
