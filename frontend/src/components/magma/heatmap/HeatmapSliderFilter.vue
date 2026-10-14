<script setup lang="ts">
// The minimum score filter of the MaGMa heatmap: hides the techniques with a lower score. The value is shown in the
// ControlBox around it (Heatmap.vue), and kept in the store.
import { ref, watch } from 'vue';
import '@vueform/slider/themes/default.css';
import Slider from '@vueform/slider';
import { magmaStore } from '@/stores/magma';

const magma = magmaStore();
const value = ref(magma.heatmapFilterValue);

watch(value, (newValue) => {
  magma.heatmapFilterValue = newValue;
});
</script>

<template>
  <div class="slider-container">
    <Slider
      v-model="value"
      :min="0"
      :max="100"
      :interval="1"
      :tooltips="false"
      :aria="{ 'aria-label': 'Minimum score' }"
    />
  </div>
</template>

<style scoped>
/* The same look as the sliders of the DeTT&CT page. */
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
