<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { COUNT_COLOR } from '@/components/common/barColor';
import { techniquesPerDataSource } from '@/domain/magma/dataSources';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const magma = magmaStore();

const counts = computed(() => techniquesPerDataSource(magma.L3UseCases(store.domain)));

// One bar per data source, the 15 with the most different techniques; the longest bar fills the box.
const rows = computed(() =>
  counts.value.slice(0, 15).map(({ dataSource, count }) => ({
    name: dataSource,
    segments: [{ value: count, color: COUNT_COLOR }],
    label: count,
  })),
);
</script>

<template>
  <BarChart :rows="rows" :max="counts[0]?.count ?? 0" :name-width="100" label="inside">
    <template #title>
      Number of Unique ATT&CK Techniques per Data Source
      <span v-if="counts.length > 15"> (Top 15)</span>
    </template>
  </BarChart>
</template>
