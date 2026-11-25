<!--
  Écran d'un round du mode Rapidité (direction « Synoptique », maquette design/direction-a-synoptique.html).

  - Photo cadrée comme un moniteur ; le chronomètre de 20 s démarre quand elle est affichée (`onvisible`).
  - Sous la photo : chrono en chiffres et barre de temps linéaire graduée à la seconde, recalculées à
    chaque image (`requestAnimationFrame` + `performance.now()`, logique dans chrono.ts) ; rouge sous
    le seuil d'alerte ; une mauvaise réponse fait sauter la barre de 2 s (segment hachuré + « −2 s »).
  - Pupitre : champ avec texte fantôme et liste de suggestions (combobox accessible). `Tab` complète,
    `↑`/`↓` parcourent, `Entrée` valide (la saisie exacte, sinon la suggestion en surbrillance),
    `Échap` ferme la liste puis vide le champ. Sur mobile, toucher une suggestion la valide.
  - Mauvaise réponse : secousse du champ (contour seul si « réduire les animations »), vibration,
    −2 s, nom barré dans les essais. Bonne réponse ou temps écoulé : bande de réponse sur la photo.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    RAPIDITE_APRES_ERREUR,
    RAPIDITE_ARRIERE_PLAN,
    RAPIDITE_DUREE_MS,
    RAPIDITE_NB_SUGGESTIONS,
    RAPIDITE_NB_SUGGESTIONS_MOBILE,
    RAPIDITE_PENALITE_MS,
    RAPIDITE_SEUIL_ALERTE_MS,
    RAPIDITE_SUGGERER_APPROCHANTS,
    RAPIDITE_TAB_VALIDE,
    RAPIDITE_VIBRATION,
    scoreRapidite,
  } from '../../config';
  import BandeReponse from '../../composants/BandeReponse.svelte';
  import GabaritRound from '../../composants/GabaritRound.svelte';
  import Icone from '../../composants/Icone.svelte';
  import PhotoRound from '../../composants/PhotoRound.svelte';
  import { deuxChiffres, formaterDecimal, formaterSecondes, INSECABLE, pluriel } from '../../lib/format';
  import type { Site } from '../../lib/types';
  import type { PropsRound } from '../types';
  import * as chrono from './chrono';
  import { reduireAvecClavier, vibrer } from './clavier';
  import { reponseAffichee, type DetailRapidite } from './mesures';
  import { creerIndex, decouper, suggerer, suiteFantome, trouverSite } from './recherche';

  let { round, numero, phase, resultat, sites, terminer }: PropsRound<DetailRapidite> = $props();

  const DUREE = RAPIDITE_DUREE_MS;
  /** « −2 s » */
  const formaterPenalite = () => `−${RAPIDITE_PENALITE_MS / 1000}${INSECABLE}s`;
  const index = $derived(creerIndex(sites));

  // --- État du round -------------------------------------------------------------------------
  let temps = $state.raw(chrono.creerChrono(DUREE));
  /** Dernier instant lu (à chaque image tant que le chronomètre tourne). */
  let maintenant = $state(0);
  let saisie = $state('');
  let actif = $state(0);
  /** L'utilisateur a choisi une suggestion avec les flèches : `Entrée` la valide même si la saisie est exacte. */
  let choixFleches = $state(false);
  let listeFermee = $state(false);
  let essais: Site[] = $state([]);
  let trouve = $state(false);
  let erreurVisible = $state(false);
  let message: { type: 'erreur' | 'info'; texte: string } | null = $state(null);
  /** Segment de temps perdu à la dernière erreur (en % de la barre), affiché hachuré puis effacé. */
  let perte: { gauche: number; largeur: number; cle: number } | null = $state(null);
  let mobile = $state(false);

  let champ: HTMLInputElement | undefined = $state();
  let zone: HTMLDivElement | undefined = $state();

  // --- Valeurs dérivées ----------------------------------------------------------------------
  const demarre = $derived(temps.debut !== null);
  const restant = $derived(chrono.restantMs(temps, maintenant));
  const enJeu = $derived(phase === 'jeu' && !trouve);
  const alerte = $derived(demarre && enJeu && restant > 0 && restant < RAPIDITE_SEUIL_ALERTE_MS);
  /** Chrono affiché au dixième supérieur : « 0,0 » seulement quand le temps est vraiment écoulé. */
  const chronoTexte = $derived(formaterDecimal(Math.ceil(restant / 100) / 10));
  const exclus = $derived(new Set(essais.map((s) => s.id)));
  const suggestions = $derived(
    enJeu && !listeFermee
      ? suggerer(index, saisie, mobile ? RAPIDITE_NB_SUGGESTIONS_MOBILE : RAPIDITE_NB_SUGGESTIONS, {
          exclus,
          approchants: RAPIDITE_SUGGERER_APPROCHANTS,
        })
      : [],
  );
  const indexActif = $derived(Math.min(actif, suggestions.length - 1));
  const active = $derived(suggestions[indexActif] ?? null);
  const fantome = $derived(active ? suiteFantome(saisie, active.site.nom_court) : '');
  const idListe = $derived(`suggestions-${numero}`);
  const idOption = (i: number) => `suggestion-${numero}-${i}`;

  // --- Chronomètre ---------------------------------------------------------------------------
  /** La photo est affichée : le temps commence à compter. */
  function photoVisible() {
    const t = performance.now();
    temps = chrono.demarrer(temps, t);
    maintenant = t;
    champ?.focus({ preventScroll: true });
  }

  /** À chaque image : relire l'horloge, et finir le round si le temps est écoulé. */
  function image() {
    if (phase !== 'jeu' || trouve || temps.debut === null || temps.arret !== null) return;
    const t = performance.now();
    maintenant = t;
    if (chrono.estEcoule(temps, t)) perdre(t);
  }

  function perdre(t: number) {
    if (trouve || phase !== 'jeu') return;
    temps = chrono.arreter(temps, t);
    maintenant = t;
    const detail: DetailRapidite = {
      trouve: false,
      tempsMs: chrono.ecouleMs(temps, t),
      restantMs: 0,
      erreurs: temps.erreurs,
      essais: essais.map((s) => s.nom_court),
    };
    terminer({ points: 0, statut: 'faux', reponse: reponseAffichee(detail, ''), detail });
  }

  function visibilite() {
    const t = performance.now();
    if (document.hidden) {
      temps = chrono.masquer(temps, t, RAPIDITE_ARRIERE_PLAN);
      if (temps.perduArrierePlan) perdre(t);
    } else {
      temps = chrono.reprendre(temps, t);
      image();
    }
  }

  onMount(() => {
    const retablirViewport = reduireAvecClavier();
    const requeteMobile = matchMedia('(max-width: 719px)');
    const surMobile = () => (mobile = requeteMobile.matches);
    surMobile();
    requeteMobile.addEventListener('change', surMobile);
    document.addEventListener('visibilitychange', visibilite);
    let raf = 0;
    const boucle = () => {
      image();
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    champ?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibilite);
      requeteMobile.removeEventListener('change', surMobile);
      retablirViewport();
    };
  });

  // --- Réponses ------------------------------------------------------------------------------
  /** Le joueur propose un site (Entrée, Tab si réglé ainsi, ou toucher une suggestion). */
  function proposer(site: Site) {
    const t = performance.now();
    if (!enJeu || !demarre) return;
    if (chrono.estEcoule(temps, t)) return perdre(t);
    if (exclus.has(site.id)) {
      message = { type: 'info', texte: `${site.nom_court} : déjà tenté.` };
      viderChamp();
      return;
    }
    if (site.id === round.site.id) {
      temps = chrono.arreter(temps, t);
      maintenant = t;
      trouve = true;
      saisie = site.nom_court;
      message = null;
      const restantMs = chrono.restantMs(temps, t);
      terminer({
        points: scoreRapidite(restantMs),
        statut: 'juste',
        reponse: site.nom_court,
        detail: {
          trouve: true,
          tempsMs: chrono.ecouleMs(temps, t),
          restantMs,
          erreurs: temps.erreurs,
          essais: essais.map((s) => s.nom_court),
        },
      });
      return;
    }
    // Mauvaise réponse : −2 s, secousse, vibration, nom barré.
    const avant = chrono.restantMs(temps, t);
    temps = chrono.penaliser(temps, t, RAPIDITE_PENALITE_MS);
    maintenant = t;
    const apres = chrono.restantMs(temps, t);
    perte = { gauche: (apres / DUREE) * 100, largeur: ((avant - apres) / DUREE) * 100, cle: temps.erreurs };
    essais = [...essais, site];
    message = { type: 'erreur', texte: `${site.nom_court} : non. ${formaterPenalite()}` };
    erreurVisible = true;
    secouer();
    vibrer(RAPIDITE_VIBRATION);
    if (RAPIDITE_APRES_ERREUR === 'vider') viderChamp();
    else champ?.select();
    if (chrono.estEcoule(temps, t)) perdre(t);
  }

  function viderChamp() {
    saisie = '';
    actif = 0;
    choixFleches = false;
    listeFermee = false;
  }

  /** Relance l'animation de secousse (classe retirée puis remise ; retirée à la fin de l'animation). */
  function secouer() {
    if (!zone) return;
    zone.classList.remove('secoue');
    void zone.offsetWidth;
    zone.classList.add('secoue');
  }

  function saisir() {
    actif = 0;
    choixFleches = false;
    listeFermee = false;
    erreurVisible = false;
    if (message?.type === 'info') message = null;
  }

  function valider() {
    if (!demarre) return;
    const exact = trouverSite(index, saisie);
    const cible = choixFleches && active ? active.site : (exact ?? active?.site ?? null);
    if (cible) {
      proposer(cible);
    } else if (saisie.trim() !== '') {
      message = { type: 'info', texte: `Aucun site ne correspond à « ${saisie.trim()} » : rien n'est compté.` };
    }
  }

  function touche(e: KeyboardEvent) {
    // Phase réponse : rien ici, `Entrée` remonte jusqu'au socle qui passe au round suivant.
    if (!enJeu || e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!e.repeat) valider();
        break;
      case 'Tab':
        if (!active || e.shiftKey) return;
        e.preventDefault();
        if (RAPIDITE_TAB_VALIDE) {
          proposer(active.site);
        } else {
          saisie = active.site.nom_court;
          actif = 0;
          choixFleches = false;
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        if (suggestions.length === 0) return;
        e.preventDefault();
        actif = (indexActif + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
        choixFleches = true;
        break;
      case 'Escape':
        if (suggestions.length > 0) listeFermee = true;
        else viderChamp();
        break;
    }
  }

  // --- Graduations de la barre (une par seconde, étiquette toutes les 5 s) ---------------------
  const SECONDES = Array.from({ length: DUREE / 1000 + 1 }, (_, s) => s);
</script>

<GabaritRound>
  {#snippet ecran()}
    <PhotoRound
      photo={round.photo}
      legende="Vue {deuxChiffres(numero)}"
      revele={phase === 'reponse'}
      onvisible={photoVisible}
    >
      {#if phase === 'jeu' && essais.length > 0}
        <p class="essais essais-photo" aria-hidden="true">
          {#each essais as s (s.id)}<s>{s.nom_court}</s>{/each}
        </p>
      {/if}
      {#if phase === 'reponse' && resultat}
        <BandeReponse
          statut={resultat.statut}
          nom={round.site.nom_court}
          detail={resultat.detail.trouve
            ? `${formaterSecondes(resultat.detail.tempsMs)} · ${pluriel(resultat.detail.erreurs, 'erreur')}`
            : "Temps écoulé : c'était ce site."}
          points={resultat.points}
        />
      {/if}
    </PhotoRound>
  {/snippet}

  {#snippet sousEcran()}
    <div class="temps" class:alerte role="timer" aria-label="Temps restant">
      <p class="chrono">
        {#key alerte ? Math.ceil(restant / 1000) : 0}
          <span class="valeur num" class:battement={alerte}>{chronoTexte}</span>
        {/key}
        <span class="unite">s</span>
      </p>
      <div class="jauge" aria-hidden="true">
        <div class="rail">
          <div class="rempli" style:width="{(restant / DUREE) * 100}%"></div>
          {#if perte}
            {#key perte.cle}
              <div class="perte" style:left="{perte.gauche}%" style:width="{perte.largeur}%"></div>
              <span class="moins num" style:left="{perte.gauche + perte.largeur / 2}%">
                −{RAPIDITE_PENALITE_MS / 1000}&nbsp;s
              </span>
            {/key}
          {/if}
        </div>
        <div class="graduations">
          {#each SECONDES as s (s)}
            <i class:majeure={s % 5 === 0} style:left="{(s / (DUREE / 1000)) * 100}%"></i>
            {#if s % 5 === 0}<b class="num" style:left="{(s / (DUREE / 1000)) * 100}%">{s}</b>{/if}
          {/each}
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet pupitre()}
    <div class="champ">
      <label class="libelle" for="saisie-{numero}">Nom du site</label>
      <div
        class="zone"
        class:erreur={erreurVisible && enJeu}
        class:juste={trouve}
        bind:this={zone}
        onanimationend={() => zone?.classList.remove('secoue')}
      >
        <div class="fantome" aria-hidden="true"><span>{saisie}</span>{enJeu ? fantome : ''}</div>
        <input
          id="saisie-{numero}"
          type="text"
          bind:this={champ}
          bind:value={saisie}
          oninput={saisir}
          onkeydown={touche}
          readonly={!enJeu}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={idListe}
          aria-autocomplete="both"
          aria-activedescendant={active ? idOption(indexActif) : undefined}
          aria-describedby="message-{numero}"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="go"
          inputmode="text"
        />
        {#if trouve}<Icone nom="ok" />{:else if erreurVisible && enJeu}<Icone nom="ko" />{/if}
      </div>
    </div>

    <ul class="suggestions" id={idListe} role="listbox" aria-label="Suggestions">
      {#each suggestions as s, i (s.site.id)}
        <!-- Le clavier passe par le champ (combobox) ; au doigt ou à la souris, toucher une suggestion la valide. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={idOption(i)}
          role="option"
          tabindex="-1"
          aria-selected={i === indexActif}
          class:actif={i === indexActif}
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => proposer(s.site)}
        >
          <span class="nom">
            {#if s.source === 'alias' || s.approchant}
              {s.site.nom_court}
            {:else}
              {#each decouper(s.site.nom_court, saisie) as morceau, j (j)}
                {#if morceau.marque}<mark>{morceau.texte}</mark>{:else}{morceau.texte}{/if}
              {/each}
            {/if}
          </span>
          {#if s.source === 'alias' && !s.approchant}
            <span class="via">
              {#each decouper(s.libelle, saisie) as morceau, j (j)}
                {#if morceau.marque}<mark>{morceau.texte}</mark>{:else}{morceau.texte}{/if}
              {/each}
            </span>
          {/if}
          <kbd class="touche">Tab</kbd>
        </li>
      {/each}
    </ul>

    <p class="message" class:erreur={message?.type === 'erreur'} id="message-{numero}" aria-live="polite">
      {#if message}
        {#if message.type === 'erreur'}<Icone nom="ko" />{/if}
        <span>{message.texte}</span>
      {:else if enJeu}
        <span class="aide"><kbd>Tab</kbd> complète · <kbd>Entrée</kbd> valide</span>
      {/if}
    </p>

    {#if essais.length > 0}
      <p class="essais essais-pupitre">
        <span class="libelle">Essais</span>
        {#each essais as s (s.id)}<s>{s.nom_court}</s>{/each}
      </p>
    {/if}
  {/snippet}
</GabaritRound>

<style>
  /* --- Temps : chrono numérique + barre graduée ------------------------------------------- */
  .temps {
    display: flex;
    align-items: flex-end;
    gap: var(--esp-4);
    padding-top: var(--esp-3);
  }
  .chrono {
    display: flex;
    align-items: baseline;
    gap: var(--esp-1);
    margin: 0;
  }
  .chrono .valeur {
    display: inline-block;
    min-width: 4ch;
    text-align: right;
    font-size: var(--taille-chrono);
    font-weight: var(--graisse-forte);
    line-height: 1;
    color: var(--c-accent);
  }
  .chrono .unite {
    color: var(--c-texte-3);
  }
  .alerte .chrono .valeur {
    color: var(--c-erreur);
  }
  /* Dernières secondes : le chrono marque chaque seconde (rôle : tension), sauf si animations réduites. */
  .battement {
    animation: battement var(--duree-courte) var(--courbe-sortie);
  }
  @keyframes battement {
    from {
      opacity: 0.4;
    }
  }
  .jauge {
    position: relative;
    flex: 1;
    padding-top: 1.25rem;
  }
  .rail {
    position: relative;
    height: var(--hauteur-barre-temps);
    background: var(--c-surface-2);
  }
  .rempli {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--c-accent);
  }
  .alerte .rempli {
    background: var(--c-erreur);
  }
  .perte {
    position: absolute;
    top: 0;
    bottom: 0;
    border: var(--trait-fin) solid var(--c-erreur);
    background: repeating-linear-gradient(-45deg, var(--c-erreur) 0 4px, transparent 4px 6px);
    animation: efface var(--duree-saut-temps) var(--courbe-sortie) var(--duree-penalite) forwards;
  }
  .moins {
    position: absolute;
    bottom: calc(100% + var(--esp-1));
    transform: translateX(-50%);
    font-size: var(--taille-petite);
    font-weight: var(--graisse-forte);
    line-height: 1;
    color: var(--c-erreur);
    white-space: nowrap;
    animation:
      apparait var(--duree-courte) var(--courbe-sortie),
      efface var(--duree-saut-temps) var(--courbe-sortie) var(--duree-penalite) forwards;
  }
  @keyframes efface {
    to {
      opacity: 0;
    }
  }
  @keyframes apparait {
    from {
      opacity: 0;
    }
  }
  .graduations {
    position: relative;
    height: 1.1rem;
    margin-top: 2px;
  }
  .graduations i {
    position: absolute;
    top: 0;
    width: var(--trait-fin);
    height: 4px;
    background: var(--c-trait-fort);
  }
  .graduations i.majeure {
    height: 7px;
    background: var(--c-texte-3);
  }
  .graduations b {
    position: absolute;
    top: 6px;
    transform: translateX(-50%);
    font-weight: var(--graisse-normale);
    font-size: var(--taille-micro);
    color: var(--c-texte-3);
  }

  /* --- Pupitre : champ, suggestions, message, essais ---------------------------------------- */
  .champ label {
    display: block;
    margin-bottom: var(--esp-2);
  }
  .zone {
    position: relative;
    height: var(--hauteur-saisie);
    background: var(--c-surface-2);
    border: var(--trait-fin) solid var(--c-trait-fort);
    border-radius: var(--rayon-1);
    display: flex;
    align-items: center;
  }
  .zone:focus-within {
    border-color: var(--c-accent);
    box-shadow: var(--halo-focus);
  }
  .zone.erreur {
    border-color: var(--c-erreur);
    box-shadow: 0 0 0 3px var(--c-erreur-doux);
    color: var(--c-erreur);
  }
  .zone.juste {
    border-color: var(--c-succes);
    box-shadow: none;
    color: var(--c-succes);
  }
  /* Classe posée en JS (`secouer`) pour pouvoir relancer l'animation à chaque erreur. */
  .zone:global(.secoue) {
    animation: secousse var(--duree-secousse) var(--courbe-secousse);
  }
  @keyframes secousse {
    20%,
    60% {
      transform: translateX(calc(var(--amplitude-secousse) * -1));
    }
    40%,
    80% {
      transform: translateX(var(--amplitude-secousse));
    }
  }
  .zone input,
  .zone .fantome {
    position: absolute;
    inset: 0;
    width: 100%;
    margin: 0;
    padding: 0 2.75rem 0 var(--esp-4);
    border: 0;
    background: transparent;
    font: var(--graisse-normale) var(--taille-saisie) var(--police-texte);
    color: var(--c-texte);
    white-space: pre;
    overflow: hidden;
  }
  .zone input {
    outline: none;
  }
  .zone input:read-only {
    cursor: default;
  }
  .zone .fantome {
    display: flex;
    align-items: center;
    color: var(--c-texte-3);
    pointer-events: none;
  }
  .zone .fantome span {
    color: transparent;
  }
  .zone :global(.icone) {
    position: absolute;
    right: var(--esp-3);
    width: 1.25rem;
    height: 1.25rem;
  }

  .suggestions {
    list-style: none;
    margin: 0;
    padding: 0;
    border: var(--trait-fin) solid var(--c-trait);
    background: var(--c-surface);
  }
  .suggestions:empty {
    display: none;
  }
  .suggestions li {
    min-height: var(--hauteur-suggestion);
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    padding: 0 var(--esp-4);
    border-left: var(--trait-fort) solid transparent;
    cursor: pointer;
    transition: background-color var(--duree-instant);
  }
  .suggestions li + li {
    border-top: var(--trait-fin) solid var(--c-trait);
  }
  .suggestions li.actif {
    background: var(--c-accent-doux);
    border-left-color: var(--c-accent);
  }
  .suggestions li:hover {
    background: var(--c-accent-doux);
  }
  .suggestions mark {
    background: none;
    color: var(--c-texte);
    font-weight: var(--graisse-forte);
  }
  .suggestions .nom {
    color: var(--c-texte-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .suggestions li.actif .nom {
    color: var(--c-texte);
  }
  .suggestions .via {
    font-size: var(--taille-petite);
    color: var(--c-texte-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .suggestions .touche {
    margin-left: auto;
    flex: none;
  }
  .suggestions li:not(.actif) .touche {
    visibility: hidden;
  }

  .message {
    min-height: 1.25rem;
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    font-size: var(--taille-petite);
    color: var(--c-texte-2);
  }
  .message.erreur :global(.icone) {
    color: var(--c-erreur);
  }
  .aide {
    color: var(--c-texte-3);
  }
  .essais {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--esp-1) var(--esp-3);
    margin: 0;
    font-size: var(--taille-petite);
  }
  .essais s {
    color: var(--c-texte-2);
    text-decoration-color: var(--c-erreur);
    text-decoration-thickness: var(--trait-fort);
  }
  .essais-photo {
    display: none;
  }

  /* Mouvement réduit : pas de battement ni de fondu ; la secousse n'a déjà plus d'amplitude (tokens). */
  @media (prefers-reduced-motion: reduce) {
    .battement,
    .moins {
      animation: none;
    }
    .perte {
      animation: efface 0s linear var(--duree-penalite) forwards;
    }
    .moins {
      animation: efface 0s linear var(--duree-penalite) forwards;
    }
  }

  /* --- Mobile (clavier ouvert : ~360 × 400 visibles) ------------------------------------------ */
  @media (max-width: 719px) {
    .temps {
      padding-top: var(--esp-1);
      gap: var(--esp-3);
      align-items: center;
    }
    .chrono .valeur {
      min-width: 3.4ch;
    }
    .jauge {
      padding-top: 0.9rem;
    }
    .graduations,
    .champ label,
    .essais-pupitre {
      display: none;
    }
    /* Message : lu par les lecteurs d'écran, mais pas de place pour lui à l'écran. */
    .message {
      position: absolute;
      width: 1px;
      height: 1px;
      min-height: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    /* Essais barrés : posés sur la photo, en bas à gauche. */
    .essais-photo {
      display: flex;
      position: absolute;
      z-index: 2;
      left: var(--esp-2);
      bottom: var(--esp-2);
      max-width: 70%;
      padding: 2px var(--esp-2);
      background: var(--c-fond);
    }
    /* Suggestions : une rangée de boutons au-dessus du champ, comme la barre du clavier ; place réservée. */
    .suggestions,
    .suggestions:empty {
      order: -1;
      display: flex;
      gap: var(--esp-1);
      min-height: var(--hauteur-suggestion);
      border: 0;
      background: none;
    }
    .suggestions li {
      flex: 1 1 0;
      min-width: 0;
      justify-content: center;
      padding: 0 var(--esp-2);
      background: var(--c-surface-2);
      border: var(--trait-fin) solid var(--c-trait);
      border-radius: var(--rayon-1);
    }
    .suggestions li + li {
      border-top: var(--trait-fin) solid var(--c-trait);
    }
    .suggestions li.actif {
      border-color: var(--c-accent);
    }
    .suggestions .via,
    .suggestions .touche {
      display: none;
    }
  }
</style>
