<script setup lang="ts">
import { computed } from 'vue';
import { tacticsStore } from '@/stores/tactics';
const store = tacticsStore();

// Create a computed property that syncs with store.searchQuery
const searchQuery = computed({
  get: () => store.searchQuery,
  set: (newValue) => {
    store.searchQuery = newValue;
  },
});
</script>

<template>
  <div class="search-bar">
    <input v-model="searchQuery" type="text" placeholder="Search techniques..." />
  </div>
</template>

<style scoped>
input[type='text'] {
  width: 100%;
  padding: 0 9px;
  font-size: 13.3px;
  border: var(--border-control);
  border-radius: 5px;
  height: 30px;
}
</style>
