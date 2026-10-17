<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { splitHint } from '@/components/common/splitHint';
import ChartLegend from '@/components/common/ChartLegend.vue';
import { TECHNIQUE_COLORS, TECHNIQUE_LEGEND } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

// A suggested data component, as shown in the chart.
interface Component {
  name: string;
  technique_count: number;
  subtechnique_count: number;
  coverage: string;
}

function getTopCoverageComponents(): Component[] {
  const components = store.currentDomain?.data_components;

  // Check if components is defined and is an array
  if (!Array.isArray(components)) {
    return [];
  }

  // Return the top 15 components (that are not used yet), which increase (sub)technique visibility the most.
  return components
    .filter((component) => component.visibility == true)
    .filter((component) => (component.quality.device_completeness ?? 0) < 5) // an empty score counts as 0
    .filter((component) => component.all_technique_count > 0)
    .slice(0, 15)
    .map((component) => ({
      name: component.name,
      technique_count: component.technique_count,
      subtechnique_count: component.subtechnique_count,
      coverage: ((component.quality.device_completeness ?? 0) * 0.2 * 100).toFixed(0),
    }));
}

// Why the chart is empty: no data component is in use (no DeTT&CT file is loaded), or all of them have full coverage.
const emptyText = computed(() =>
  store.currentDomain?.data_components?.some((component) => component.visibility)
    ? 'Every data component in use has full coverage.'
    : 'Load a DeTT&CT file on the DeTT&CT page to see this suggestion.',
);

// The longest bar in this chart fills the box.
const maxCount = computed(() =>
  Math.max(0, ...getTopCoverageComponents().map((x) => x.technique_count + x.subtechnique_count)),
);

const rows = computed(() =>
  getTopCoverageComponents().map((component) => ({
    name: component.name,
    segments: [
      { value: component.technique_count, color: TECHNIQUE_COLORS.techniques },
      { value: component.subtechnique_count, color: TECHNIQUE_COLORS.subtechniques },
    ],
    label: component.technique_count + component.subtechnique_count,
    hint: splitHint([
      [component.technique_count, 'technique', 'techniques'],
      [component.subtechnique_count, 'sub-technique', 'sub-techniques'],
    ]),
  })),
);
</script>

<template>
  <BarChart :rows="rows" :max="maxCount" :empty="emptyText">
    <template #title>
      Suggested Coverage Improvements
      <span v-if="getTopCoverageComponents().length >= 15"> (Top 15)</span>
    </template>
    <template #name="{ row, index }">
      {{ row.name }} <span class="coverage">· {{ getTopCoverageComponents()[index].coverage }}% covered</span>
    </template>
    <template #legend><ChartLegend :items="TECHNIQUE_LEGEND" /></template>
  </BarChart>
</template>

<style scoped>
/* The current coverage after the name, quieter than the name. */
.coverage {
  color: #666666;
}
</style>
