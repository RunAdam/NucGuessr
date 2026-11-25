/**
 * Fiche courte d'un site, pour le compte rendu de fin de partie : réacteurs, source froide.
 * (Format provisoire : la phase 5 pourra l'ajuster, voir docs/DECISIONS.md 1.1.)
 */
import { formaterEntier, INSECABLE } from './format';
import type { Site, Tranche } from './types';

/**
 * Réacteurs en service, regroupés par palier et puissance, avec la plage des années de couplage :
 * « 4 × 910 MWe (CP1), 1981–1983 » ; Flamanville : « 2 × 1 330 MWe (P4), 1985–1986 + 1 × 1 600 MWe (EPR), 2024 ».
 */
export function formaterReacteurs(site: Pick<Site, 'reacteurs'>): string {
  const groupes: Tranche[][] = [];
  for (const t of site.reacteurs.tranches) {
    const g = groupes.find((x) => x[0]?.palier === t.palier && x[0]?.puissance_mwe === t.puissance_mwe);
    if (g) g.push(t);
    else groupes.push([t]);
  }
  return groupes
    .map((g) => {
      const t0 = g[0] as Tranche;
      const annees = g.map((t) => t.couplage);
      const min = Math.min(...annees);
      const max = Math.max(...annees);
      const plage = min === max ? String(min) : `${min}–${max}`;
      return `${g.length}${INSECABLE}×${INSECABLE}${formaterEntier(t0.puissance_mwe)}${INSECABLE}MWe (${t0.palier}), ${plage}`;
    })
    .join(' + ');
}

const TYPES_SOURCE: Record<string, string> = { fleuve: 'fleuve', riviere: 'rivière', mer: 'mer', estuaire: 'estuaire' };

/** « Loire (fleuve) », « Manche (mer) » ; pas de redite si le nom contient déjà le type (« Estuaire de la Gironde »). */
export function formaterSourceFroide(site: Pick<Site, 'source_froide'>): string {
  const { nom, type } = site.source_froide;
  const libelle = TYPES_SOURCE[type] ?? type;
  return nom.toLowerCase().includes(libelle.toLowerCase()) ? nom : `${nom} (${libelle})`;
}
