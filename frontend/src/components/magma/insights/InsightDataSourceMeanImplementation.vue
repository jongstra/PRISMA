<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { SCORE_COLORS } from '@/components/common/barColor';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';
import { meanPerDataSource } from '@/domain/magma/dataSources';

const store = tacticsStore();
const magma = magmaStore();

const means = computed(() => meanPerDataSource(magma.L3UseCases(store.domain), 'implementation'));

// One bar per data source, the 15 with the lowest mean, with the mean and the number of use cases.
const rows = computed(() =>
  means.value.slice(0, 15).map(({ dataSource, mean, count }) => ({
    name: dataSource,
    segments: [{ value: mean, color: SCORE_COLORS.implementation }],
    label: `${mean.toFixed(2)}% (${count} UC)`,
  })),
);
</script>

<template>
  <BarChart
    hint="The mean implementation of the L3 use cases with each data source, lowest first. An empty score counts as 0%."
    :rows="rows"
    :max="100"
    empty="No data sources in the L3 sheet yet."
  >
    <template #title>
      Implementation per Data Source
      <span v-if="means.length > 15"> (Lowest 15)</span>
    </template>
  </BarChart>
</template>
