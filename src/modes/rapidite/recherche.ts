/**
 * Mode Rapidité : normalisation des noms et autocomplétion (logique pure, sans DOM, testée dans
 * tests/rapidite/recherche.test.ts).
 *
 * - `normaliser` rend une saisie comparable : sans accents ni majuscules, tirets et apostrophes
 *   remplacés par des espaces, « st »/« ste » développés en « saint »/« sainte ».
 * - `creerIndex` prépare, pour chaque site, ses libellés (nom court, nom complet, alias) normalisés.
 * - `suggerer` renvoie les sites dont un libellé commence par la saisie, à partir de n'importe quel mot
 *   (`seine` → Nogent-sur-Seine), un site au plus une fois, classés du plus évident au moins évident.
 *   Si rien ne commence par la saisie, on propose les sites les plus proches (faute de frappe).
 * - `trouverSite` reconnaît une saisie complète (nom court, nom complet ou alias) : validation directe.
 */

/** Ce dont la recherche a besoin d'un site (sous-ensemble de `Site`). */
export interface SiteCherchable {
  id: string;
  nom_court: string;
  nom_complet: string;
  alias: readonly string[];
}

/** Origine d'un libellé : sert au classement des suggestions. */
export type SourceLibelle = 'court' | 'complet' | 'alias';

interface Libelle {
  source: SourceLibelle;
  /** Texte d'origine (« St-Laurent-des-Eaux »). */
  texte: string;
  /** Texte normalisé (« saint laurent des eaux »). */
  norme: string;
  /** Mots normalisés. */
  mots: string[];
  /** Positions (en caractères dans `norme`) d'où une saisie peut commencer à correspondre. */
  debuts: number[];
  /** La saisie doit être plus longue que ceci pour correspondre (nom complet : « centrale nucleaire de »). */
  minimum: number;
}

interface EntreeIndex<S> {
  site: S;
  libelles: Libelle[];
}

/** Index de recherche, à construire une fois (`creerIndex`). */
export interface IndexRecherche<S extends SiteCherchable> {
  entrees: readonly EntreeIndex<S>[];
}

/** Une suggestion : le site, et le libellé qui a correspondu. */
export interface Suggestion<S extends SiteCherchable> {
  site: S;
  /** Libellé qui a correspondu (nom court, nom complet ou alias), tel qu'écrit dans les données. */
  libelle: string;
  source: SourceLibelle;
  /** `true` si le site est proposé par proximité (faute de frappe), sans correspondance exacte du début. */
  approchant: boolean;
}

// -----------------------------------------------------------------------------------------------
// Normalisation
// -----------------------------------------------------------------------------------------------

/** Abréviations développées (mot entier) : « st laurent » = « saint laurent ». */
const ABREVIATIONS: Readonly<Record<string, string>> = { st: 'saint', ste: 'sainte' };

/**
 * Forme comparable d'un texte : minuscules, sans accents (é → e, ç → c, œ → oe), tirets, apostrophes
 * (droite et typographique), points et autres signes remplacés par des espaces, espaces multiples
 * réduits, « st »/« ste » développés.
 */
export function normaliser(texte: string): string {
  return plier(texte)
    .split(' ')
    .filter((m) => m !== '')
    .map((m) => ABREVIATIONS[m] ?? m)
    .join(' ');
}

/** Minuscules, sans accents, tout signe non alphanumérique remplacé par une espace (longueur conservée sauf ligatures). */
function plier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^\p{L}\p{N}]/gu, ' ');
}

/**
 * Mots qui ne peuvent pas commencer une correspondance au milieu d'un libellé : sinon « de » ou « sur »
 * proposeraient la moitié des sites. Une saisie qui commence par l'un d'eux correspond quand même au
 * début du libellé (« le blayais »). Les mots d'une lettre (« Chinon B ») non plus : « b » ne doit pas
 * proposer Chinon.
 */
const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'en', 'et']);

/** Début générique des noms complets (« centrale nucleaire de nogent sur seine »). */
const PREFIXE_COMPLET = /^centrale nucleaire (de |du |des |d )?/;

function creerLibelle(source: SourceLibelle, texte: string): Libelle {
  const norme = normaliser(texte);
  const mots = norme.split(' ');
  const debuts: number[] = [];
  let position = 0;
  // Nom complet : seule une saisie qui dépasse « centrale nucléaire de » peut y correspondre par le
  // début ; les mots du nom lui-même sont déjà couverts par le nom court.
  const generique = source === 'complet' ? (PREFIXE_COMPLET.exec(norme)?.[0].length ?? 0) : 0;
  mots.forEach((mot, i) => {
    if (i === 0 || (source !== 'complet' && mot.length > 1 && !MOTS_VIDES.has(mot))) debuts.push(position);
    position += mot.length + 1;
  });
  return { source, texte, norme, mots, debuts: generique > 0 ? [0] : debuts, minimum: generique };
}

/** Prépare l'index de recherche (une fois pour toutes, les données ne changent pas en cours de partie). */
export function creerIndex<S extends SiteCherchable>(sites: readonly S[]): IndexRecherche<S> {
  return {
    entrees: sites.map((site) => ({
      site,
      libelles: [
        creerLibelle('court', site.nom_court),
        creerLibelle('complet', site.nom_complet),
        ...site.alias.map((a) => creerLibelle('alias', a)),
      ],
    })),
  };
}

// -----------------------------------------------------------------------------------------------
// Correspondance exacte
// -----------------------------------------------------------------------------------------------

/** Site dont un libellé (nom court, nom complet ou alias) est exactement la saisie, une fois normalisée. */
export function trouverSite<S extends SiteCherchable>(index: IndexRecherche<S>, saisie: string): S | null {
  const q = normaliser(saisie);
  if (q === '') return null;
  for (const e of index.entrees) {
    if (e.libelles.some((l) => l.norme === q)) return e.site;
  }
  return null;
}

// -----------------------------------------------------------------------------------------------
// Suggestions
// -----------------------------------------------------------------------------------------------

/**
 * Rang d'une correspondance (plus petit = plus pertinent) :
 * 0 saisie identique à un libellé, 1 début du nom court, 2 début d'un alias ou du nom complet,
 * 3 mot intérieur du nom court (« seine »), 4 mot intérieur d'un alias (« laurent des »).
 */
function rang(l: Libelle, debut: number, q: string): number {
  if (l.norme === q) return 0;
  if (debut === 0) return l.source === 'court' ? 1 : 2;
  return l.source === 'court' ? 3 : 4;
}

interface Candidat<S extends SiteCherchable> {
  suggestion: Suggestion<S>;
  rang: number;
  /** Ordre du site dans les données : départage stable des égalités, avec l'ordre alphabétique. */
  ordre: number;
}

function comparer<S extends SiteCherchable>(a: Candidat<S>, b: Candidat<S>): number {
  return (
    a.rang - b.rang || a.suggestion.site.nom_court.localeCompare(b.suggestion.site.nom_court, 'fr') || a.ordre - b.ordre
  );
}

/** Options de `suggerer`. */
export interface OptionsSuggestions {
  /** Identifiants à ne pas proposer (sites déjà tentés pendant le round). */
  exclus?: ReadonlySet<string>;
  /** Si rien ne commence par la saisie, proposer les sites à une ou deux fautes près (par défaut : oui). */
  approchants?: boolean;
}

/** Sites proposés pour une saisie, au plus `max`, un site au plus une fois. */
export function suggerer<S extends SiteCherchable>(
  index: IndexRecherche<S>,
  saisie: string,
  max: number,
  { exclus = new Set(), approchants: avecApprochants = true }: OptionsSuggestions = {},
): Suggestion<S>[] {
  const q = normaliser(saisie);
  if (q === '' || max <= 0) return [];
  const meilleurs = new Map<string, Candidat<S>>();
  index.entrees.forEach((e, ordre) => {
    if (exclus.has(e.site.id)) return;
    for (const l of e.libelles) {
      if (q.length <= l.minimum) continue;
      for (const debut of l.debuts) {
        if (!l.norme.startsWith(q, debut)) continue;
        const c: Candidat<S> = {
          suggestion: { site: e.site, libelle: l.texte, source: l.source, approchant: false },
          rang: rang(l, debut, q),
          ordre,
        };
        const actuel = meilleurs.get(e.site.id);
        if (!actuel || comparer(c, actuel) < 0) meilleurs.set(e.site.id, c);
      }
    }
  });
  if (meilleurs.size === 0) return avecApprochants ? approchants(index, q, max, exclus) : [];
  return [...meilleurs.values()]
    .sort(comparer)
    .slice(0, max)
    .map((c) => c.suggestion);
}

// -----------------------------------------------------------------------------------------------
// Fautes de frappe : sites les plus proches quand rien ne commence par la saisie
// -----------------------------------------------------------------------------------------------

/**
 * Nombre de fautes tolérées selon la longueur de la saisie : aucune sous 4 lettres (trop de sites
 * voisins), une de 4 à 7, deux au-delà.
 */
export function fautesToleres(longueur: number): number {
  if (longueur < 4) return 0;
  return longueur < 8 ? 1 : 2;
}

/**
 * Distance d'édition entre `q` et le meilleur début de `cible` (insertion, suppression, substitution,
 * inversion de deux lettres voisines) : « tricastn » est à 1 de « tricastin », « gravlines » à 1 de
 * « gravelines ». On compare `q` au début de la cible, pas à la cible entière : une saisie incomplète
 * n'est pas une faute.
 */
export function distanceDebut(q: string, cible: string): number {
  const n = q.length;
  const m = cible.length;
  // d[i][j] : distance entre q[0..i) et cible[0..j) (Damerau-Levenshtein restreinte).
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const ligne = new Array<number>(m + 1).fill(0);
    ligne[0] = i;
    return ligne;
  });
  for (let j = 0; j <= m; j++) (d[0] as number[])[j] = j;
  for (let i = 1; i <= n; i++) {
    const li = d[i] as number[];
    const lp = d[i - 1] as number[];
    for (let j = 1; j <= m; j++) {
      const cout = q[i - 1] === cible[j - 1] ? 0 : 1;
      let v = Math.min((lp[j] as number) + 1, (li[j - 1] as number) + 1, (lp[j - 1] as number) + cout);
      if (i > 1 && j > 1 && q[i - 1] === cible[j - 2] && q[i - 2] === cible[j - 1]) {
        v = Math.min(v, ((d[i - 2] as number[])[j - 2] as number) + 1);
      }
      li[j] = v;
    }
  }
  // Meilleur début de la cible : la ligne finale, sur toutes les longueurs de préfixe.
  return Math.min(...(d[n] as number[]));
}

function approchants<S extends SiteCherchable>(
  index: IndexRecherche<S>,
  q: string,
  max: number,
  exclus: ReadonlySet<string>,
): Suggestion<S>[] {
  const tolerance = fautesToleres(q.length);
  if (tolerance === 0) return [];
  const trouves: { suggestion: Suggestion<S>; distance: number; ordre: number }[] = [];
  index.entrees.forEach((e, ordre) => {
    if (exclus.has(e.site.id)) return;
    let meilleur: { distance: number; l: Libelle } | null = null;
    for (const l of e.libelles) {
      if (l.minimum > 0) continue; // nom complet : déjà couvert par le nom court
      for (const debut of l.debuts) {
        // Comparer au plus q.length + tolérance caractères : on cherche un début, pas le libellé entier.
        const distance = distanceDebut(q, l.norme.slice(debut, debut + q.length + tolerance));
        if (distance <= tolerance && (!meilleur || distance < meilleur.distance)) meilleur = { distance, l };
      }
    }
    if (meilleur) {
      trouves.push({
        suggestion: { site: e.site, libelle: meilleur.l.texte, source: meilleur.l.source, approchant: true },
        distance: meilleur.distance,
        ordre,
      });
    }
  });
  return trouves
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.suggestion.site.nom_court.localeCompare(b.suggestion.site.nom_court, 'fr') ||
        a.ordre - b.ordre,
    )
    .slice(0, max)
    .map((t) => t.suggestion);
}

// -----------------------------------------------------------------------------------------------
// Affichage : texte fantôme et mise en évidence
// -----------------------------------------------------------------------------------------------

/**
 * Suite du texte fantôme affiché dans le champ : si `nom` commence par la saisie (aux accents, à la
 * casse, aux tirets et apostrophes près, lettre pour lettre), la fin du nom ; sinon une chaîne vide.
 * « nogen » + « Nogent-sur-Seine » → « t-sur-Seine ».
 */
export function suiteFantome(saisie: string, nom: string): string {
  if (saisie === '' || saisie.length >= nom.length) return '';
  const debut = nom.slice(0, saisie.length);
  return plier(debut) === plier(saisie) ? nom.slice(saisie.length) : '';
}

/**
 * Découpe un libellé en morceaux à mettre en évidence (partie qui correspond à la saisie) ou non,
 * pour la liste de suggestions. Approché au mot près pour les abréviations (« St » couvre « saint »).
 */
export function decouper(libelle: string, saisie: string): { texte: string; marque: boolean }[] {
  const q = normaliser(saisie);
  if (q === '') return [{ texte: libelle, marque: false }];
  // Mots d'origine avec leur position, et leur forme normalisée.
  const mots: { debut: number; fin: number; norme: string }[] = [];
  for (const m of libelle.matchAll(/[\p{L}\p{N}]+/gu)) {
    const norme = normaliser(m[0]);
    if (norme) mots.push({ debut: m.index, fin: m.index + m[0].length, norme });
  }
  const normes = mots.map((m) => m.norme);
  for (let i = 0; i < mots.length; i++) {
    if (!normes.slice(i).join(' ').startsWith(q)) continue;
    // La correspondance commence au mot i : avancer mot par mot sur la longueur de la saisie.
    let reste = q.length;
    let fin = (mots[i] as (typeof mots)[number]).debut;
    for (let j = i; j < mots.length && reste > 0; j++) {
      const mot = mots[j] as (typeof mots)[number];
      const abrege = mot.fin - mot.debut !== mot.norme.length; // « St » pour « saint » : le mot entier
      fin = reste >= mot.norme.length || abrege ? mot.fin : mot.debut + reste;
      reste -= mot.norme.length + 1;
    }
    const debut = (mots[i] as (typeof mots)[number]).debut;
    return [
      { texte: libelle.slice(0, debut), marque: false },
      { texte: libelle.slice(debut, fin), marque: true },
      { texte: libelle.slice(fin), marque: false },
    ].filter((p) => p.texte !== '');
  }
  return [{ texte: libelle, marque: false }];
}
