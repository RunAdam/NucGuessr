<!--
  Écran d'un round du mode Rapidité. PROVISOIRE : à remplacer en phase 5 (saisie avec autocomplétion,
  chronomètre de 20 s démarré par `onvisible` de PhotoRound, barre de temps, −2 s par erreur…).
-->
<script lang="ts">
  import EnConstruction from '../../composants/EnConstruction.svelte';
  import type { PropsRound } from '../types';

  let props: PropsRound<null> = $props();
</script>

<EnConstruction {...props} nomMode="Rapidité" phaseFeuilleDeRoute={5} />
