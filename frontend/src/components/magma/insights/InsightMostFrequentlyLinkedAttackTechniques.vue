<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { COUNT_COLOR } from '@/components/common/barColor';
import { techniqueUrl } from '@/domain/attack/links';
import { linkedTechniqueCounts } from '@/domain/magma/techniques';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const magma = magmaStore();

const counts = computed(() => linkedTechniqueCounts(magma.L3UseCases(store.domain)));

// One bar per technique, the 15 with the most L3 use cases; the longest bar fills the box.
const rows = computed(() =>
  counts.value.slice(0, 15).map(({ techniqueId, count }) => ({
    name: techniqueId,
    segments: [{ value: count, color: COUNT_COLOR }],
    label: count,
  })),
);
</script>

<template>
  <BarChart
    :rows="rows"
    :max="counts[0]?.count ?? 0"
    :name-width="100"
    label="inside"
    empty="No ATT&CK techniques in the L3 sheet yet."
  >
    <template #title>
      Most Frequently Linked ATT&CK Techniques
      <span v-if="counts.length > 15"> (Top 15)</span>
    </template>
    <template #name="{ row }">
      <a :href="techniqueUrl(row.name)" target="_blank">{{ row.name }}</a>
    </template>
  </BarChart>
</template>

<style scoped>
a {
  color: blue;
}
</style>
