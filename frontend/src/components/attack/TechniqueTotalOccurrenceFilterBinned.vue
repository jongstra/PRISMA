<script setup lang="ts">
// The minimum total occurrence filter of the DeTT&CT page: hides techniques that groups and software use less often,
// in four levels (see controlValues.ts). The level is kept in the store, so the knob is where it was when the page is
// opened again.
import { ref, watch } from 'vue';
import '@vueform/slider/themes/default.css';
import Slider from '@vueform/slider';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const value = ref(store.minTotalOccurrencesBinned);

watch(value, (newValue) => {
  store.minTotalOccurrencesBinned = newValue;
});
</script>

<template>
  <div class="slider-container">
    <Slider
      v-model="value"
      :min="0"
      :max="3"
      :interval="1"
      :tooltips="false"
      :aria="{ 'aria-label': 'Minimum total occurrence' }"
    />
  </div>
</template>

<style scoped>
.slider-container {
  padding: 0 10px;
}

.slider-container :deep(.slider-connect) {
  background-color: firebrick;
}

.slider-container :deep(.slider-base) {
  background-color: seashell;
}
</style>
