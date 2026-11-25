<!--
  Écran d'un round du mode Distance. PROVISOIRE : à remplacer en phase 6 (carte de France zoomable,
  repère du joueur, validation, trait proposition → réponse, distance et score).
-->
<script lang="ts">
  import EnConstruction from '../../composants/EnConstruction.svelte';
  import type { PropsRound } from '../types';

  let props: PropsRound<null> = $props();
</script>

<EnConstruction {...props} nomMode="Distance" phaseFeuilleDeRoute={6} />
