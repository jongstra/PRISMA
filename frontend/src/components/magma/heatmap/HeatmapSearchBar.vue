<script setup lang="ts">
import { computed } from 'vue';
import { magmaStore } from '@/stores/magma';
const magma = magmaStore();

// Create a computed property that syncs with magma.searchQuery
const searchQuery = computed({
  get: () => magma.heatmapSearchQuery,
  set: (newValue) => {
    magma.heatmapSearchQuery = newValue;
  },
});
</script>

<template>
  <div class="search-bar">
    <input v-model="searchQuery" class="search-field" type="text" placeholder="Search techniques..." />
  </div>
</template>
