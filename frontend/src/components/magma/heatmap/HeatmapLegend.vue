<script setup lang="ts">
// The legend of the MaGMa heatmap: not detectable (striped), no use cases (the base colour), and the green of a score from 0 to
// 100% for techniques with use cases (the heatmap colours them continuously; these are samples). The label is in the
// ControlBox around it (Heatmap.vue).
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '@/components/common/notDetectableStyle';
import { vHint } from '@/components/common/hint';
import { heatmapFill } from './heatmapFill';

const SAMPLES = [0, 25, 50, 75, 100];
</script>

<template>
  <div class="legend-items">
    <div class="swatch" :style="NOT_DETECTABLE_STYLE" v-hint="NOT_DETECTABLE_TEXT">n/a</div>
    <div class="swatch" v-hint="'No use cases: no L3 use case detects this technique'">none</div>
    <div
      v-for="sample in SAMPLES"
      :key="sample"
      class="swatch"
      :style="heatmapFill(sample)"
      v-hint="`Score ${sample}%`"
    >
      {{ sample }}
    </div>
  </div>
</template>

<style scoped>
.legend-items {
  display: flex;
  justify-content: space-between;
  gap: 2px;
  max-width: 222px;
}

/* The same swatches as the DeTT&CT legend (VisibilityLegend.vue), with slightly smaller text, so 'none' fits. */
.swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: var(--border-control);
  border-radius: 5px;
  background-color: var(--color-technique);
  font-size: 10px;
  font-weight: bold;
}
</style>
