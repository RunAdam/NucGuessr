import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Configuration Svelte : TypeScript dans les composants (`<script lang="ts">`). */
export default {
  preprocess: vitePreprocess(),
};
