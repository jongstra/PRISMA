<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { splitHint } from '@/components/common/splitHint';
import ChartLegend from '@/components/common/ChartLegend.vue';
import { TECHNIQUE_COLORS, TECHNIQUE_LEGEND } from '@/components/common/barColor';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

interface Tactic {
  name: string;
  technique_count: number;
  subtechnique_count: number;
}

function getTechniqueCountPerTactic(): Tactic[] {
  const tactics = store.currentDomain?.tactics;

  // Check if tactics is defined and is an array
  if (!Array.isArray(tactics)) {
    return [];
  }

  return tactics.map((tactic) => ({
    name: tactic.name,
    technique_count: tactic.technique_count,
    subtechnique_count: tactic.subtechnique_count,
  }));
}

// The longest bar in this chart fills the box.
const maxCount = computed(() =>
  Math.max(0, ...getTechniqueCountPerTactic().map((x) => x.technique_count + x.subtechnique_count)),
);

const rows = computed(() =>
  getTechniqueCountPerTactic().map((tactic) => ({
    name: tactic.name,
    segments: [
      { value: tactic.technique_count, color: TECHNIQUE_COLORS.techniques },
      { value: tactic.subtechnique_count, color: TECHNIQUE_COLORS.subtechniques },
    ],
    label: tactic.technique_count + tactic.subtechnique_count,
    hint: splitHint([
      [tactic.technique_count, 'technique', 'techniques'],
      [tactic.subtechnique_count, 'sub-technique', 'sub-techniques'],
    ]),
  })),
);
</script>

<template>
  <BarChart :rows="rows" :max="maxCount">
    <template #title> (Sub)Techniques per Tactic </template>
    <template #legend><ChartLegend :items="TECHNIQUE_LEGEND" /></template>
  </BarChart>
</template>
