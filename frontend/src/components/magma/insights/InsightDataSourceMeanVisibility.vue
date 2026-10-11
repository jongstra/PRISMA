<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';
import { meanPerDataSource } from '@/domain/magma/dataSources';

const store = tacticsStore();
const magma = magmaStore();

const means = computed(() => meanPerDataSource(magma.L3UseCases(store.domain), 'visibility'));

// One bar per data source, the 15 with the lowest mean, with the mean and the number of use cases.
const rows = computed(() =>
  means.value.slice(0, 15).map(({ dataSource, mean, count }) => ({
    name: dataSource,
    segments: [{ value: mean, color: 'red' }],
    label: `${mean.toFixed(2)}% (${count} UC)`,
  })),
);
</script>

<template>
  <BarChart :rows="rows" :max="100" label-space="100px" :name-width="100" label="inside-wide">
    <template #title>
      Data Sources - Mean Visibility
      <span v-if="means.length >= 15"> (Top 15 Worst)</span>
    </template>
  </BarChart>
</template>
