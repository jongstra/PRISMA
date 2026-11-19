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
    <input v-model="searchQuery" class="search-field" type="text" placeholder="Search techniques..." />
  </div>
</template>
