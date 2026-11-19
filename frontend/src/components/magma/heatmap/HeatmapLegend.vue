<script setup lang="ts">
// The legend of the MaGMa heatmap, as the DeTT&CT legend: not detectable (striped), 0% (the base colour, also for a
// technique without use cases; a technique with use cases has a thick border, see the hint), and the four green steps of
// heatmapFill.ts (up to 25, 50, 75 and 100%). The label is in the ControlBox around it (Heatmap.vue).
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '@/components/common/notDetectableStyle';
import { vHint } from '@/components/common/hint';
import { HEATMAP_STEPS, heatmapFill } from './heatmapFill';

// Each swatch shows its step, named by its upper bound; its hint gives the range.
const SAMPLES = [
  { label: 0, hint: 'Score 0%, or no use cases. A technique with use cases has a thick border.' },
  ...HEATMAP_STEPS.map((step, index) => ({
    label: step.upTo,
    hint:
      index === 0
        ? `Score above 0, up to ${step.upTo}%`
        : `Score above ${HEATMAP_STEPS[index - 1]!.upTo}, up to ${step.upTo}%`,
  })),
];
</script>

<template>
  <div class="legend-items">
    <div class="swatch" :style="NOT_DETECTABLE_STYLE" v-hint="NOT_DETECTABLE_TEXT">n/a</div>
    <div
      v-for="sample in SAMPLES"
      :key="sample.label"
      class="swatch"
      :style="heatmapFill(sample.label)"
      v-hint="sample.hint"
    >
      {{ sample.label }}
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
