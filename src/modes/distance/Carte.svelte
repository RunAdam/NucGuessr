<!--
  Carte de France du mode Distance (SVG sur mesure, direction « Synoptique », tokens --carte-*).

  - Zoom : molette, boutons + / −, pincement, touches + / − ; déplacement : glisser, flèches du clavier.
  - Niveau de détail : les affluents et les villes secondaires n'apparaissent qu'en zoomant (src/config.ts).
  - Repère : un tap ou un clic le pose (un glisser de la carte ne le pose pas), on le repose ailleurs ou on le
    fait glisser ; au clavier, `Espace` le pose au centre (réticule).
  - Paires repère → réponse (phase réponse, compte rendu) : trait en tirets, losange de la position réelle,
    étiquette de distance, recadrage animé sur les points (instantané si `prefers-reduced-motion`).
  La carte ne connaît la position d'une centrale que si on la lui donne dans `paires` (jamais pendant le jeu).
-->
<script lang="ts">
  import { geoPath, type GeoProjection } from 'd3-geo';
  import { interpolateZoom } from 'd3-interpolate';
  import { select } from 'd3-selection';
  import { zoom as comportementZoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
  import { onDestroy, untrack } from 'svelte';
  import {
    DISTANCE_AFFICHER_FLEUVES,
    DISTANCE_AFFICHER_VILLES,
    DISTANCE_PAS_CLAVIER_PX,
    DISTANCE_RECADRAGE_MARGE_PX,
    DISTANCE_RECADRAGE_MS,
    DISTANCE_RECADRAGE_ZOOM_MAX,
    DISTANCE_TOLERANCE_TAP_PX,
    DISTANCE_ZOOM_BOUTON,
    DISTANCE_ZOOM_BOUTON_MS,
    DISTANCE_ZOOM_FLEUVES_SECONDAIRES,
    DISTANCE_ZOOM_MAX,
    DISTANCE_ZOOM_VILLES_SECONDAIRES,
  } from '../../config';
  import { FLEUVES, FRANCE, FRONTIERES_VOISINS, VILLES, VOISINS } from './fond';
  import { creerProjection, depuisEcran, versEcran } from './projection';
  import { cadrer, formaterDistance, IDENTITE, type LatLon, type Paire, type Transformation } from './geo';

  interface Props {
    /** Repère du joueur pendant le jeu (`null` : pas encore posé). */
    repere?: LatLon | null;
    /** Le joueur peut poser ou déplacer son repère. */
    interactif?: boolean;
    onposer?: (p: LatLon) => void;
    /** Paires à afficher (phase réponse, compte rendu) ; la carte se recadre dessus quand elles changent. */
    paires?: readonly Paire[];
    /** Étiquette de distance sur le trait (une seule paire). */
    etiquettes?: boolean;
    /** Nom accessible de la carte. */
    libelle: string;
  }

  let { repere = null, interactif = false, onposer, paires = [], etiquettes = true, libelle }: Props = $props();

  let svg: SVGSVGElement | undefined = $state();
  let largeur = $state(0);
  let hauteur = $state(0);
  let t: Transformation = $state.raw(IDENTITE);
  let projection: GeoProjection | null = $state.raw(null);
  let comportement: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  let animation = 0;

  const mouvementReduit = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Projection recalculée quand la taille change, en gardant le même centre géographique et le même zoom.
  $effect(() => {
    const l = largeur;
    const h = hauteur;
    if (!l || !h) return;
    untrack(() => {
      const ancienne = projection;
      const ancienT = t;
      const nouvelle = creerProjection(l, h, FRANCE);
      projection = nouvelle;
      if (ancienne && ancienT.k > 1) {
        const centre = depuisEcran(ancienne, ancienT, l / 2, h / 2);
        const [px, py] = nouvelle([centre.lon, centre.lat]) ?? [l / 2, h / 2];
        appliquer({ k: ancienT.k, x: l / 2 - ancienT.k * px, y: h / 2 - ancienT.k * py });
      }
    });
  });

  const chemins = $derived.by(() => {
    if (!projection) return null;
    const p = geoPath(projection);
    const fleuves = (niveau: number) =>
      FLEUVES.filter((f) => f.properties.niveau === niveau)
        .map((f) => p(f) ?? '')
        .join('');
    return {
      voisins: VOISINS.map((v) => p(v) ?? '').join(''),
      frontieres: p(FRONTIERES_VOISINS) ?? '',
      france: p(FRANCE) ?? '',
      fleuves1: DISTANCE_AFFICHER_FLEUVES ? fleuves(1) : '',
      fleuves2: DISTANCE_AFFICHER_FLEUVES ? fleuves(2) : '',
    };
  });

  const villes = $derived.by(() => {
    if (!projection || !DISTANCE_AFFICHER_VILLES) return [];
    const proj = projection;
    return VILLES.filter((v) => v.properties.niveau === 1 || t.k >= DISTANCE_ZOOM_VILLES_SECONDAIRES).map((v) => {
      const [lon, lat] = v.geometry.coordinates as [number, number];
      const [x, y] = versEcran(proj, t, { lat, lon });
      return { nom: v.properties.nom, x, y };
    });
  });

  const ecran = (p: LatLon): [number, number] => (projection ? versEcran(projection, t, p) : [0, 0]);

  // Comportement de zoom (d3-zoom) : molette, glisser, pincement ; bornes de zoom et de déplacement.
  $effect(() => {
    const el = svg;
    const l = largeur;
    const h = hauteur;
    if (!el || !l || !h) return;
    const marge = Math.min(l, h) * 0.3;
    comportement ??= comportementZoom<SVGSVGElement, unknown>()
      .clickDistance(DISTANCE_TOLERANCE_TAP_PX)
      .tapDistance(DISTANCE_TOLERANCE_TAP_PX)
      // Pas de zoom ni de glisser de carte depuis le repère du joueur : on le déplace.
      .filter(
        (e: MouseEvent & TouchEvent) =>
          (!e.ctrlKey || e.type === 'wheel') && !e.button && !(e.target as Element | null)?.closest?.('.repere-joueur'),
      )
      .on('zoom', (e: { transform: Transformation }) => {
        t = { k: e.transform.k, x: e.transform.x, y: e.transform.y };
      });
    comportement.scaleExtent([1, DISTANCE_ZOOM_MAX]).translateExtent([
      [-marge, -marge],
      [l + marge, h + marge],
    ]);
    // Un double tap ne zoome pas : deux taps rapides reposent simplement le repère.
    select(el).call(comportement).on('dblclick.zoom', null);
  });

  function appliquer(cible: Transformation) {
    if (svg && comportement) {
      select(svg).call(comportement.transform, zoomIdentity.translate(cible.x, cible.y).scale(cible.k));
    } else {
      t = cible;
    }
  }

  /** Animation de la vue actuelle vers `cible` (trajectoire de zoom de van Wijk, comme d3). */
  function animerVers(cible: Transformation, duree: number) {
    cancelAnimationFrame(animation);
    if (duree <= 0 || mouvementReduit() || !largeur) {
      appliquer(cible);
      return;
    }
    const l = largeur;
    const h = hauteur;
    const vue = (v: Transformation): [number, number, number] => [(l / 2 - v.x) / v.k, (h / 2 - v.y) / v.k, l / v.k];
    const interpolation = interpolateZoom(vue(t), vue(cible));
    const debut = performance.now();
    const pas = (maintenant: number) => {
      const u = Math.min(1, (maintenant - debut) / duree);
      const e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2; // cubique entrée-sortie
      const [cx, cy, w] = interpolation(e);
      const k = l / w;
      appliquer({ k, x: l / 2 - k * cx, y: h / 2 - k * cy });
      if (u < 1) animation = requestAnimationFrame(pas);
    };
    animation = requestAnimationFrame(pas);
  }

  function zoomer(facteur: number) {
    const k = Math.min(DISTANCE_ZOOM_MAX, Math.max(1, t.k * facteur));
    const cx = (largeur / 2 - t.x) / t.k;
    const cy = (hauteur / 2 - t.y) / t.k;
    animerVers({ k, x: largeur / 2 - k * cx, y: hauteur / 2 - k * cy }, DISTANCE_ZOOM_BOUTON_MS);
  }

  /** Vue de départ : la France entière. */
  function vueGenerale() {
    animerVers(IDENTITE, DISTANCE_ZOOM_BOUTON_MS);
  }

  // Recadrage sur les paires (phase réponse, compte rendu).
  $effect(() => {
    const proj = projection;
    const l = largeur;
    const h = hauteur;
    if (!proj || !l || !h || paires.length === 0) return;
    const points = paires
      .flatMap((p) => [p.proposition, p.reponse])
      .map((p) => (proj([p.lon, p.lat]) ?? [0, 0]) as [number, number]);
    const cible = cadrer(points, l, h, DISTANCE_RECADRAGE_MARGE_PX, 1, DISTANCE_RECADRAGE_ZOOM_MAX);
    untrack(() => animerVers(cible, DISTANCE_RECADRAGE_MS));
  });

  // ---------------------------------------------------------------------------
  // Pose du repère : un tap ou un clic sans déplacement (un glisser ou un pincement ne pose rien).
  let appui: { x: number; y: number } | null = null;
  let pointeurs = 0;
  let geste = false;

  function appuye(e: PointerEvent) {
    pointeurs += 1;
    if (pointeurs === 1) {
      appui = { x: e.clientX, y: e.clientY };
      geste = false;
    } else {
      geste = true; // deuxième doigt : pincement
    }
  }
  function bouge(e: PointerEvent) {
    if (appui && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > DISTANCE_TOLERANCE_TAP_PX) geste = true;
  }
  function relache() {
    pointeurs = Math.max(0, pointeurs - 1);
  }

  function clic(e: MouseEvent) {
    const gesteFini = geste;
    geste = false;
    appui = null;
    if (!interactif || gesteFini || !svg || !projection) return;
    const r = svg.getBoundingClientRect();
    onposer?.(depuisEcran(projection, t, e.clientX - r.left, e.clientY - r.top));
  }

  // Glisser du repère lui-même.
  let glisse = $state(false);
  function repereAppuye(e: PointerEvent) {
    if (!interactif) return;
    e.stopPropagation();
    glisse = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function repereBouge(e: PointerEvent) {
    if (!glisse || !svg || !projection) return;
    const r = svg.getBoundingClientRect();
    onposer?.(depuisEcran(projection, t, e.clientX - r.left, e.clientY - r.top));
  }
  function repereRelache(e: PointerEvent) {
    glisse = false;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }

  // Clavier (la carte a le focus) : flèches = déplacer, + / − = zoomer, Espace = poser le repère au centre.
  function touche(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || !svg || !comportement) return;
    const pas = DISTANCE_PAS_CLAVIER_PX;
    const deplacements: Record<string, [number, number]> = {
      ArrowLeft: [pas, 0],
      ArrowRight: [-pas, 0],
      ArrowUp: [0, pas],
      ArrowDown: [0, -pas],
    };
    const d = deplacements[e.key];
    if (d) {
      e.preventDefault();
      select(svg).call(comportement.translateBy, d[0] / t.k, d[1] / t.k);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomer(DISTANCE_ZOOM_BOUTON);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomer(1 / DISTANCE_ZOOM_BOUTON);
    } else if (e.key === ' ' && interactif && projection) {
      e.preventDefault();
      onposer?.(depuisEcran(projection, t, largeur / 2, hauteur / 2));
    }
  }

  onDestroy(() => cancelAnimationFrame(animation));
</script>

<div class="carte" bind:clientWidth={largeur} bind:clientHeight={hauteur}>
  <!-- La carte est un widget à part entière (role="application") : souris, toucher et clavier y sont gérés. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <svg
    bind:this={svg}
    class:interactif
    role="application"
    aria-label={libelle}
    aria-roledescription="carte"
    tabindex="0"
    onclick={clic}
    onkeydown={touche}
    onpointerdown={appuye}
    onpointermove={bouge}
    onpointerup={relache}
    onpointercancel={relache}
  >
    <rect class="mer" width={largeur} height={hauteur} />
    {#if chemins}
      <g transform="translate({t.x} {t.y}) scale({t.k})">
        <path class="voisins" d={chemins.voisins} />
        <path class="frontieres" d={chemins.frontieres} />
        <path class="france" d={chemins.france} />
        <path class="fleuves secondaires" class:cache={t.k < DISTANCE_ZOOM_FLEUVES_SECONDAIRES} d={chemins.fleuves2} />
        <path class="fleuves" d={chemins.fleuves1} />
      </g>
    {/if}
    <g class="villes" aria-hidden="true">
      {#each villes as v (v.nom)}
        <circle cx={v.x} cy={v.y} r="2" />
        <text x={v.x + 5} y={v.y + 4}>{v.nom}</text>
      {/each}
    </g>

    {#each paires as p, i (i)}
      {@const a = ecran(p.proposition)}
      {@const b = ecran(p.reponse)}
      <g class="paire">
        <line class="trait" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        <g transform="translate({a[0]} {a[1]})">
          <circle class="anneau" r="8" />
          <circle class="point" r="3.5" />
        </g>
        <path class="losange" d="M0 -8 L8 0 L0 8 L-8 0 Z" transform="translate({b[0]} {b[1]})" />
        {#if p.numero !== undefined}
          <text class="numero" x={b[0] + 10} y={b[1] - 8}>{p.numero}</text>
        {/if}
        {#if etiquettes}
          {@const ex = (a[0] + b[0]) / 2}
          {@const ey = (a[1] + b[1]) / 2}
          <g class="etiquette" transform="translate({ex} {ey})">
            <rect x="-34" y="-11" width="68" height="20" />
            <text y="4">{formaterDistance(p.distanceKm)}</text>
          </g>
        {/if}
      </g>
    {/each}

    {#if repere && paires.length === 0}
      {@const r = ecran(repere)}
      <g
        class="repere-joueur"
        class:glisse
        transform="translate({r[0]} {r[1]})"
        onpointerdown={repereAppuye}
        onpointermove={repereBouge}
        onpointerup={repereRelache}
        onpointercancel={repereRelache}
        role="presentation"
      >
        <circle class="zone" r="22" />
        <circle class="anneau" r="9" />
        <circle class="point" r="4" />
      </g>
    {/if}
    {#if interactif}
      <g class="reticule" aria-hidden="true" transform="translate({largeur / 2} {hauteur / 2})">
        <path d="M-12 0 H-4 M4 0 H12 M0 -12 V-4 M0 4 V12" />
      </g>
    {/if}
  </svg>

  <div class="commandes">
    <button
      type="button"
      class="commande"
      aria-label="Zoomer"
      onclick={() => zoomer(DISTANCE_ZOOM_BOUTON)}
      disabled={t.k >= DISTANCE_ZOOM_MAX}
    >
      +
    </button>
    <button
      type="button"
      class="commande"
      aria-label="Dézoomer"
      onclick={() => zoomer(1 / DISTANCE_ZOOM_BOUTON)}
      disabled={t.k <= 1}
    >
      −
    </button>
    <button
      type="button"
      class="commande vue"
      aria-label="Voir toute la France"
      onclick={vueGenerale}
      disabled={t.k <= 1}
    >
      <svg viewBox="-8 -8 16 16" aria-hidden="true">
        <path d="M-6 -2 V-6 H-2 M2 -6 H6 V-2 M6 2 V6 H2 M-2 6 H-6 V2" />
      </svg>
    </button>
  </div>
  <span class="source">Fond de carte&nbsp;: Natural Earth</span>
  <span class="echelle libelle num" aria-hidden="true">
    ×{t.k < 10 ? t.k.toFixed(1).replace('.', ',') : Math.round(t.k)}
  </span>
</div>

<style>
  .carte {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--carte-mer);
    border: var(--trait-fin) solid var(--c-trait);
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  svg.interactif {
    cursor: crosshair;
  }
  svg:focus-visible {
    outline: var(--trait-fort) solid var(--c-accent);
    outline-offset: calc(var(--trait-fort) * -1);
  }
  .mer {
    fill: var(--carte-mer);
  }
  path {
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .voisins {
    fill: var(--c-surface);
  }
  .frontieres {
    fill: none;
    stroke: var(--carte-limite-region);
    stroke-width: var(--carte-frontiere-epaisseur);
  }
  .france {
    fill: var(--carte-terre);
    stroke: var(--carte-frontiere);
    stroke-width: var(--carte-frontiere-epaisseur);
  }
  .fleuves {
    fill: none;
    stroke: var(--carte-fleuve);
    stroke-width: var(--carte-fleuve-epaisseur);
  }
  .fleuves.secondaires {
    stroke-width: var(--carte-frontiere-epaisseur);
  }
  .cache {
    display: none;
  }
  .villes {
    pointer-events: none;
  }
  .villes circle {
    fill: var(--carte-ville);
  }
  .villes text,
  .numero,
  .etiquette text {
    font-family: var(--police-chiffres);
    font-size: var(--taille-micro);
    fill: var(--carte-ville);
    paint-order: stroke;
    stroke: var(--carte-mer);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .trait {
    stroke: var(--carte-trait);
    stroke-width: var(--carte-trait-epaisseur);
    stroke-dasharray: var(--carte-trait-tirets);
  }
  .paire,
  .reticule {
    pointer-events: none;
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
    stroke: var(--carte-mer);
    stroke-width: var(--trait-fin);
  }
  .numero {
    fill: var(--carte-marqueur-reponse);
    font-size: var(--taille-petite);
  }
  .etiquette rect {
    fill: var(--c-fond);
    stroke: var(--c-trait-fort);
    stroke-width: var(--trait-fin);
  }
  .etiquette text {
    fill: var(--c-texte);
    font-size: var(--taille-petite);
    text-anchor: middle;
    stroke: none;
  }
  .repere-joueur {
    cursor: grab;
    touch-action: none;
  }
  .repere-joueur.glisse {
    cursor: grabbing;
  }
  .repere-joueur .zone {
    fill: transparent;
  }
  .reticule {
    display: none;
  }
  .reticule path {
    stroke: var(--c-accent);
    stroke-width: var(--trait-fin);
  }
  svg:focus-visible .reticule {
    display: inline;
  }
  .commandes {
    position: absolute;
    top: var(--esp-2);
    right: var(--esp-2);
    display: flex;
    flex-direction: column;
    border: var(--trait-fin) solid var(--c-trait-fort);
    background: var(--c-fond);
  }
  .commande {
    width: var(--hauteur-suggestion);
    height: var(--hauteur-suggestion);
    border: 0;
    background: none;
    font: var(--graisse-forte) var(--taille-titre) / 1 var(--police-chiffres);
    color: var(--c-texte);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .commande + .commande {
    border-top: var(--trait-fin) solid var(--c-trait);
  }
  .commande:hover:not(:disabled) {
    background: var(--c-accent-doux);
  }
  .commande:disabled {
    color: var(--c-texte-3);
    cursor: default;
  }
  .commande svg {
    position: static;
    width: 1rem;
    height: 1rem;
  }
  .commande svg path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .source {
    position: absolute;
    right: var(--esp-2);
    bottom: var(--esp-1);
    font-size: var(--taille-micro);
    color: var(--c-texte-3);
    pointer-events: none;
  }
  .echelle {
    position: absolute;
    left: var(--esp-2);
    bottom: var(--esp-1);
    color: var(--c-texte-3);
    pointer-events: none;
  }
</style>
