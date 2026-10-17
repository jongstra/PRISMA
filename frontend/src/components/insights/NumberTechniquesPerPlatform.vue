<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { splitHint } from '@/components/common/splitHint';
import ChartLegend from '@/components/common/ChartLegend.vue';
import { TECHNIQUE_COLORS, TECHNIQUE_LEGEND } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

interface Platform {
  name: string;
  technique_count: number;
  subtechnique_count: number; // Added this field
}

function getTechniqueCountPerPlatform(): Platform[] {
  const platforms = store.currentDomain?.platforms;

  // Check if platforms is defined and is an array
  if (!Array.isArray(platforms)) {
    return [];
  }

  // Ensure each platform has a subtechnique_count
  return platforms.map((platform) => ({
    name: platform.name,
    technique_count: platform.technique_count,
    subtechnique_count: platform.subtechnique_count ?? 0,
  }));
}

// The longest bar in this chart fills the box.
const maxCount = computed(() =>
  Math.max(0, ...getTechniqueCountPerPlatform().map((x) => x.technique_count + x.subtechnique_count)),
);

const rows = computed(() =>
  getTechniqueCountPerPlatform().map((platform) => ({
    name: platform.name,
    segments: [
      { value: platform.technique_count, color: TECHNIQUE_COLORS.techniques },
      { value: platform.subtechnique_count, color: TECHNIQUE_COLORS.subtechniques },
    ],
    label: platform.technique_count + platform.subtechnique_count,
    hint: splitHint([
      [platform.technique_count, 'technique', 'techniques'],
      [platform.subtechnique_count, 'sub-technique', 'sub-techniques'],
    ]),
  })),
);
</script>

<template>
  <BarChart hint="How many techniques and sub-techniques ATT&CK lists for each platform." :rows="rows" :max="maxCount">
    <template #title> (Sub)Techniques per Platform </template>
    <template #legend><ChartLegend :items="TECHNIQUE_LEGEND" /></template>
  </BarChart>
</template>
