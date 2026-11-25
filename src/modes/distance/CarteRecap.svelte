<!--
  Carte récapitulative du compte rendu (mode Distance) : les 5 repères du joueur et les 5 positions réelles,
  reliés deux à deux et numérotés comme le relevé. Zoom et déplacement possibles, pas de pose de repère.
-->
<script lang="ts">
  import type { PropsRecap } from '../types';
  import { chargerCarte } from './chargement';
  import type { Paire } from './geo';
  import type { DetailDistance } from './index';

  let { rounds, resultats }: PropsRecap<DetailDistance> = $props();

  let carte = $state(chargerCarte());

  const paires: Paire[] = $derived(
    resultats.flatMap((r, i) => {
      const round = rounds[i];
      return round
        ? [
            {
              proposition: r.detail.repere,
              reponse: { lat: round.site.lat, lon: round.site.lon },
              distanceKm: r.detail.distanceKm,
              numero: i + 1,
            },
          ]
        : [];
    }),
  );
</script>

<figure class="recap">
  <figcaption class="libelle">Carte des repères</figcaption>
  <div class="cadre">
    {#await carte}
      <p class="attente libelle" role="status">Chargement de la carte…</p>
    {:then Carte}
      <Carte
        {paires}
        etiquettes={false}
        libelle="Carte récapitulative : vos repères (ronds) reliés aux positions réelles (losanges numérotés par round)."
      />
    {:catch}
      <div class="attente" role="alert">
        <p>La carte n'a pas pu être chargée.</p>
        <button class="bouton-discret" type="button" onclick={() => (carte = chargerCarte())}>Réessayer</button>
      </div>
    {/await}
  </div>
  <p class="legende" aria-hidden="true">
    <svg viewBox="-10 -10 20 20"><circle r="7" class="anneau" /><circle r="3" class="point" /></svg> Votre repère
    <svg viewBox="-10 -10 20 20"><path d="M0 -7 L7 0 L0 7 L-7 0 Z" class="losange" /></svg> Position réelle
  </p>
</figure>

<style>
  .recap {
    display: grid;
    gap: var(--esp-2);
  }
  .cadre {
    height: 24rem;
    display: flex;
  }
  .attente {
    margin: auto;
    color: var(--c-texte-2);
  }
  .legende {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    font-size: var(--taille-petite);
    color: var(--c-texte-2);
  }
  .legende svg {
    width: 1rem;
    height: 1rem;
  }
  .legende svg + :global(*),
  .legende svg:not(:first-child) {
    margin-left: var(--esp-3);
  }
  .anneau {
    fill: none;
    stroke: var(--carte-marqueur-joueur);
    stroke-width: var(--carte-trait-epaisseur);
  }
  .point {
    fill: var(--carte-marqueur-joueur);
  }
  .losange {
    fill: var(--carte-marqueur-reponse);
  }
  @media (max-width: 719px) {
    .cadre {
      height: 20rem;
    }
  }
</style>
