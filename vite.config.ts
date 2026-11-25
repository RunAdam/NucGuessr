/**
 * Configuration Vite (build, serveur de développement) et Vitest (tests).
 *
 * `base` : chemin du site publié. Par défaut `./` (chemins relatifs) : le même build fonctionne sur
 * GitHub Pages quel que soit le nom du dépôt (`https://<compte>.github.io/NucGuessr/`), dans
 * `npm run preview` et sur un autre hébergeur statique, car le routage par hash ne sert jamais
 * qu'un seul fichier `index.html`. Pour forcer un chemin absolu : `NUCGUESSR_BASE=/NucGuessr/ npm run build`.
 */
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: process.env.NUCGUESSR_BASE ?? './',
  plugins: [svelte()],
  build: {
    target: 'es2022',
    // Les photos et les polices sont dans public/ : elles ne passent pas par le bundle.
    assetsInlineLimit: 0,
  },
  test: {
    // Uniquement les tests du dossier tests/ (jamais design/ ni scripts/, qui ont leurs propres outils).
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
