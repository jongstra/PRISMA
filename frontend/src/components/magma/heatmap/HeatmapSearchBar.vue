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
    <input v-model="searchQuery" type="text" placeholder="Search techniques..." />
  </div>
</template>

<style scoped>
/* The same look as the technique search of the DeTT&CT page (SearchBar.vue). */
input[type='text'] {
  width: 100%;
  padding: 0 9px;
  font-size: 13.3px;
  border: 1.5px solid #333;
  border-radius: 5px;
  height: 30px;
}
</style>
