// Lance toutes les simulations de la phase 0, dans l'ordre de docs/DECISIONS.md.
// Lancer : node scripts/sim/tout.mjs   (Node ≥ 22.18 ou 23.6, pour importer src/config.ts directement)

await import('./anti-repetition.mjs');
await import('./bareme-rapidite.mjs');
await import('./durees.mjs');
await import('./bareme-distance.mjs');
