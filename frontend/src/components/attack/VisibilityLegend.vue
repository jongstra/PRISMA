<template>
  <div class="legend-container">
    <div class="legend-items">
      <div v-for="item in legendItems" :key="item.label" class="legend-item">
        <button :style="item.style" v-hint="item.hint" class="legend-button">
          {{ item.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The legend of the DeTT&CT matrix, labelled as the MaGMa heatmap's legend: techniques that cannot be detected via data
// sources (n/a), a visibility of 0%, and the four steps of visibilityColour.ts, each named by its upper bound; the hint
// gives the range. Every technique has a visibility (a data source that is not in the file counts as 0%), so there is
// no 'none' as on the heatmap.
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '../common/notDetectableStyle';
import { vHint } from '../common/hint';
import { VISIBILITY_STEPS, visibilityColour } from './visibilityColour';

const legendItems: { label: string; style: Record<string, string>; hint: string }[] = [
  { label: 'n/a', style: NOT_DETECTABLE_STYLE, hint: NOT_DETECTABLE_TEXT },
  { label: '0', style: visibilityColour(0), hint: 'Visibility 0%' },
  ...VISIBILITY_STEPS.map((step, index) => ({
    label: String(step.upTo),
    style: visibilityColour(step.upTo / 100),
    hint: `Visibility above ${index === 0 ? 0 : VISIBILITY_STEPS[index - 1]!.upTo}, up to ${step.upTo}%`,
  })),
];
</script>

<style scoped>
/* The swatches spread over the width of the box, up to the width they have in the four-column panel; in a wider box
   (a narrow window) they keep that spacing. The label is in the ControlBox around the legend. */
.legend-items {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  max-width: 250px;
}

.legend-button {
  width: 29px;
  height: 30px;
  padding: 0;
  border: var(--border-control);
  background-color: var(--color-technique); /* like a technique without visibility in the matrix */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
  line-height: 1.15;
}
</style>
