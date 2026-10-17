<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { COUNT_COLOR } from '@/components/common/barColor';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const magma = magmaStore();

// The longest bar in this chart fills the box.
const maxCount = computed(() =>
  Math.max(
    0,
    magma.L1UseCases(store.domain).length,
    magma.L2UseCases(store.domain).length,
    magma.L3UseCases(store.domain).length,
  ),
);

// One bar per level.
const rows = computed(() =>
  (
    [
      ['L1', magma.L1UseCases(store.domain).length],
      ['L2', magma.L2UseCases(store.domain).length],
      ['L3', magma.L3UseCases(store.domain).length],
    ] as [string, number][]
  ).map(([name, count]) => ({ name, segments: [{ value: count, color: COUNT_COLOR }], label: count })),
);
</script>

<template>
  <BarChart hint="How many use cases each sheet has: L1, L2 and L3." :rows="rows" :max="maxCount">
    <template #title> Use Cases per Layer </template>
  </BarChart>
</template>
