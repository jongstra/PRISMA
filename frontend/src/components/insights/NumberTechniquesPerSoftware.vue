<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { splitHint } from '@/components/common/splitHint';
import ChartLegend from '@/components/common/ChartLegend.vue';
import { TECHNIQUE_COLORS, TECHNIQUE_LEGEND } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

interface Software {
  name: string;
  technique_count: number;
  subtechnique_count: number;
}

function getTechniqueCountPerSoftware(): Software[] {
  const softwares = store.currentDomain?.softwares;

  // Check if softwares is defined and is an array
  if (!Array.isArray(softwares)) {
    return [];
  }

  // Return the top 15 softwares (they are pre-sorted in Python on all_technique_count). Remove any softwares with a 0 all_technique_count.
  return softwares
    .filter((software) => software.all_technique_count > 0)
    .slice(0, 15)
    .map((software) => ({
      name: software.name,
      technique_count: software.technique_count,
      subtechnique_count: software.subtechnique_count,
    }));
}

// The longest bar in this chart fills the box.
const maxCount = computed(() =>
  Math.max(0, ...getTechniqueCountPerSoftware().map((x) => x.technique_count + x.subtechnique_count)),
);

const rows = computed(() =>
  getTechniqueCountPerSoftware().map((software) => ({
    name: software.name,
    segments: [
      { value: software.technique_count, color: TECHNIQUE_COLORS.techniques },
      { value: software.subtechnique_count, color: TECHNIQUE_COLORS.subtechniques },
    ],
    label: software.technique_count + software.subtechnique_count,
    hint: splitHint([
      [software.technique_count, 'technique', 'techniques'],
      [software.subtechnique_count, 'sub-technique', 'sub-techniques'],
    ]),
  })),
);
</script>

<template>
  <BarChart
    hint="The malware and tools in ATT&CK known to use the most techniques and sub-techniques."
    :rows="rows"
    :max="maxCount"
  >
    <template #title>
      (Sub)Techniques per Software
      <span v-if="getTechniqueCountPerSoftware().length >= 15"> (Top 15)</span>
    </template>
    <template #legend><ChartLegend :items="TECHNIQUE_LEGEND" /></template>
  </BarChart>
</template>
