<template>
  <div class="legend-container">
    <div class="legend-items">
      <div v-for="item in legendItems" :key="item.range" class="legend-item">
        <button :style="item.style" v-hint="item.title" class="legend-button">
          {{ item.range }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The legend of the DeTT&CT matrix: a swatch per visibility band, in the colours of the technique buttons
// (visibilityColour.ts), and one for techniques that cannot be detected via data sources.
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '../common/notDetectableStyle';
import { vHint } from '../common/hint';
import { visibilityColour } from './visibilityColour';

const bands: [string, number][] = [
  ['<= 1%', 0.01],
  ['<= 25%', 0.25],
  ['<= 50%', 0.5],
  ['<= 75%', 0.75],
  ['<= 99%', 0.99],
  ['> 99%', 1],
];
const legendItems: { range: string; style: Record<string, string>; title?: string }[] = [
  { range: 'n/a', style: NOT_DETECTABLE_STYLE, title: NOT_DETECTABLE_TEXT },
  ...bands.map(([range, ratio]) => ({ range, style: visibilityColour(ratio) })),
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
