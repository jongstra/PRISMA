<script setup lang="ts">
import TechniqueButton from './TechniqueButton.vue';
import type { Tactic, Technique } from '@/stores/tactics';
import { averageVisibilityPercentage } from '@/domain/attack/visibility';
import { vHint } from '../common/hint';

const TACTIC_VISIBILITY_HINT =
  "The average visibility of this tactic's techniques; techniques that ATT&CK lists no data components for are left out.";

defineProps<{ tactic: Tactic; techniques: Technique[] }>();

// Visibility of a tactic: the average over its techniques that can be detected via data sources.
const tacticVisibility = (tactic: Tactic) => {
  const percentage = averageVisibilityPercentage(tactic.techniques);
  return percentage === null ? 'n/a' : `${Math.round(percentage)}%`;
};
</script>

<template>
  <div ref="buttonColumnRef" class="button-column">
    <!-- Tactic -->
    <div class="button-column-tactic-name-div">
      <p class="button-column-tactic-name">{{ tactic.name }}</p>
    </div>

    <!-- Technique count statistic -->
    <div class="button-column-stats-div">
      <p class="button-column-stat-1">{{ tactic.techniques.length }} techniques</p>

      <!-- Compute the tactic-visibility based on the technique visibility_ratio value. -->
      <p v-hint="TACTIC_VISIBILITY_HINT" class="button-column-stat-2">{{ tacticVisibility(tactic) }} visibility</p>
    </div>

    <!-- Techniques column -->
    <div v-for="(technique, index) in techniques" :key="index">
      <TechniqueButton :technique="technique" />
    </div>
  </div>
</template>

<style scoped>
.button-column {
  display: grid;
}

.button-column-tactic-name-div,
.button-column-stats-div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.button-column-tactic-name {
  align-content: flex-end;
  height: 40px;
  width: 141px;
  margin-bottom: 5px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
}

.button-column-stat-1 {
  font-size: 12px;
  margin-bottom: 3px;
}

.button-column-stat-2 {
  font-size: 9px;
  margin-bottom: 4px;
}
</style>
