<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import PotentialLegend from './PotentialLegend.vue';
import { potentialHint, potentialSegments } from './potentialSegments';
import type { UseCase } from '@/stores/magma';

const props = defineProps<{ L1UseCase: UseCase; relatedL3UseCases: UseCase[] }>();

// The 15 L3 use cases below this L1 use case with the most improvement potential.
const rows = computed(() =>
  [...props.relatedL3UseCases]
    .sort((a, b) => (b.potential ?? 100) - (a.potential ?? 100))
    .slice(0, 15)
    .map((useCase) => ({
      name: useCase.id,
      segments: potentialSegments(useCase),
      label: `${(useCase.potential ?? 100).toFixed(2)}%`,
      hint: potentialHint(useCase),
    })),
);
</script>

<template>
  <BarChart class="full-height" :rows="rows" :max="100" empty="No L3 use cases below this one yet.">
    <template #title>
      L3 Potential:
      <span class="use-case-id">{{ L1UseCase.id }}</span> <span>{{ L1UseCase.name }}</span>
      <span v-if="relatedL3UseCases.length > 15"> (Top 15)</span>
    </template>
    <template #legend>
      <PotentialLegend />
    </template>
  </BarChart>
</template>

<style scoped>
/* The chart takes the height of its row on the Insights tab, so charts in the same row are equally high. */
.full-height {
  height: 100%;
}

/* The title is bold, but main.css sets every element in it to normal weight: the name stays normal, the ID is bold. */
.use-case-id {
  font-weight: bold;
}
</style>
