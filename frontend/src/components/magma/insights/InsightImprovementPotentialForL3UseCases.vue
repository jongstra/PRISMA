<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import PotentialLegend from './PotentialLegend.vue';
import { potentialHint, potentialSegments } from './potentialSegments';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const magma = magmaStore();

// The L3 use cases, the most improvement potential first.
const useCases = computed(() =>
  magma.L3UseCases(store.domain).sort((a, b) => (b.potential ?? 100) - (a.potential ?? 100)),
);

// The 15 L3 use cases with the most improvement potential.
const rows = computed(() =>
  useCases.value.slice(0, 15).map((useCase) => ({
    name: useCase.id,
    segments: potentialSegments(useCase),
    label: `${(useCase.potential ?? 100).toFixed(2)}%`,
    hint: potentialHint(useCase),
  })),
);
</script>

<template>
  <BarChart
    hint="The L3 use cases with the most room to improve. Potential = 100% − weight, and weight = visibility × implementation × effectiveness."
    :rows="rows"
    :max="100"
    empty="No L3 use cases yet."
  >
    <template #title>
      L3 Improvement Potential
      <span v-if="useCases.length > 15"> (Top 15)</span>
    </template>
    <template #legend>
      <PotentialLegend />
    </template>
  </BarChart>
</template>
