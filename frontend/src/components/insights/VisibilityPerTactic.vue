<script setup lang="ts">
import BarChart from '@/components/common/BarChart.vue';
import { barColor } from '@/components/common/barColor';
import { computed } from 'vue';
import { tacticsStore, type Tactic } from '@/stores/tactics';
import { averageVisibilityPercentage, isDetectable } from '@/domain/attack/visibility';
const store = tacticsStore();

function getTactics(): Tactic[] {
  const tactics = store.currentDomain?.tactics?.slice(); // A shallow copy

  if (!tactics) {
    return []; // Return an empty array if no tactics are found
  }

  return tactics;
}

// Visibility of a tactic: the average over its techniques that can be detected via data sources.
function getVisibilityPercentage(tactic: Tactic) {
  return Math.round(averageVisibilityPercentage(tactic.techniques) ?? 0);
}

// Number of (unique) techniques in the domain that cannot be detected via data sources; these are left out of the averages.
const notDetectableCount = computed(
  () =>
    new Set(
      getTactics()
        .flatMap((tactic) => tactic.techniques)
        .filter((technique) => !isDetectable(technique))
        .map((technique) => technique.external_id),
    ).size,
);

// One bar per tactic, from red (0%) to green (100%).
const rows = computed(() =>
  getTactics().map((tactic) => {
    const percentage = getVisibilityPercentage(tactic);
    return { name: tactic.name, segments: [{ value: percentage, color: barColor(percentage) }], label: percentage };
  }),
);
</script>

<template>
  <BarChart
    hint="How well the data components in use cover each tactic: the average visibility of its techniques, from their device completeness. Techniques that ATT&CK lists no data components for are left out."
    :rows="rows"
    :max="100"
  >
    <template #title> Visibility % per Tactic </template>
    <template #footnote>
      <div v-if="notDetectableCount > 0" class="footnote">
        Not counted: {{ notDetectableCount }} technique(s) for which ATT&CK lists no data components (not detectable via
        data sources).
      </div>
    </template>
  </BarChart>
</template>

<style scoped>
.footnote {
  margin: 2px 8px 2px;
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
