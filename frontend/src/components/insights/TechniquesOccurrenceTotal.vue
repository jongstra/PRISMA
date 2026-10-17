<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { splitHint } from '@/components/common/splitHint';
import ChartLegend from '@/components/common/ChartLegend.vue';
import { OCCURRENCE_COLORS, OCCURRENCE_LEGEND } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

function getTopTechniques() {
  const sortedTechniques = [...store.techniquesOccurrences].sort((a, b) => b.total_occurrence - a.total_occurrence);
  return sortedTechniques;
}

// The longest bar in this chart fills the box.
const maxCount = computed(() => Math.max(0, ...getTopTechniques().map((x) => x.total_occurrence)));

// Red: groups; olive: software.
const rows = computed(() =>
  getTopTechniques()
    .slice(0, 15)
    .map((technique) => ({
      name: technique.name,
      segments: [
        { value: technique.group_occurrence, color: OCCURRENCE_COLORS.groups },
        { value: technique.software_occurrence, color: OCCURRENCE_COLORS.software },
      ],
      label: technique.total_occurrence,
      hint: splitHint([
        [technique.group_occurrence, 'group', 'groups'],
        [technique.software_occurrence, 'software', 'software'],
      ]),
    })),
);
</script>

<template>
  <BarChart
    hint="The techniques used most by groups and software together: both counts added up."
    :rows="rows"
    :max="maxCount"
  >
    <template #title>
      Technique Occurrence: Total
      <span v-if="getTopTechniques().length >= 15"> (Top 15)</span>
    </template>
    <template #legend><ChartLegend :items="OCCURRENCE_LEGEND" /></template>
  </BarChart>
</template>
