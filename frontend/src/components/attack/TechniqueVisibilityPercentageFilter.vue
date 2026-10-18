<script setup lang="ts">
// The visibility filter of the DeTT&CT page: two knobs for the lowest and highest visibility to show. The range is
// kept in the store, so the knobs are where they were when the page is opened again.
import { ref, watch } from 'vue';
import '@vueform/slider/themes/default.css';
import Slider from '@vueform/slider';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const values = ref([Math.round(store.minVisibilityRatio * 100), Math.round(store.maxVisibilityRatio * 100)]);

watch(values, (newValues) => {
  store.minVisibilityRatio = newValues[0]! / 100;
  store.maxVisibilityRatio = newValues[1]! / 100;
});
</script>

<template>
  <div class="slider-container">
    <Slider
      v-model="values"
      :min="0"
      :max="100"
      :interval="1"
      :tooltips="false"
      :options="{ connect: [false, true, false] }"
      :range="true"
      :aria="{ 'aria-label': 'Visibility percentage' }"
    />
  </div>
</template>

<style scoped>
.slider-container {
  padding: 0 10px;
}

/* The selected range in red, the rest of the track grey. */
.slider-container :deep(.slider-connect) {
  background-color: var(--color-slider-range);
}

.slider-container :deep(.slider-base) {
  background-color: var(--color-slider-track);
}
</style>
