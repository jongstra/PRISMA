<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { OCCURRENCE_COLORS } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

function getTopTechniquesBySoftware() {
  const sortedTechniques = [...store.techniquesOccurrences].sort(
    (a, b) => b.software_occurrence - a.software_occurrence,
  );
  return sortedTechniques;
}

// The longest bar in this chart fills the box.
const maxCount = computed(() => Math.max(0, ...getTopTechniquesBySoftware().map((x) => x.software_occurrence)));

// Olive: the number of software that use the technique.
const rows = computed(() =>
  getTopTechniquesBySoftware()
    .slice(0, 15)
    .map((technique) => ({
      name: technique.name,
      segments: [{ value: technique.software_occurrence, color: OCCURRENCE_COLORS.software }],
      label: technique.software_occurrence,
    })),
);
</script>

<template>
  <BarChart hint="The techniques used by the most malware and tools in ATT&CK." :rows="rows" :max="maxCount">
    <template #title>
      Technique Occurrence: Software
      <span v-if="getTopTechniquesBySoftware().length >= 15"> (Top 15)</span>
    </template>
  </BarChart>
</template>
