<script setup lang="ts">
// The legend of the DeTT&CT matrix and of the MaGMa heatmap: n/a (striped, not detectable from data) and a scale: a bar
// with a white part for 0% and the four colour steps, the numbers below it (scaleTicks.ts). Each part has its own hint.
import { computed } from 'vue';
import { NOT_DETECTABLE_STYLE } from './notDetectableStyle';
import { vHint } from './hint';
import { scaleTicks, stepHints } from './scaleTicks';

const props = defineProps<{
  steps: { upTo: number; colour: string }[];
  name: string; // what the colours measure, for the hints: 'Visibility', 'Weight', …
  zeroHint: string;
}>();

const WHITE_SHARE = 0.6; // the white part is a bit narrower than a colour step
const NA_HINT = 'Not detectable from data: ATT&CK lists no data components for this technique.';

const upTo = computed(() => props.steps.map((step) => step.upTo));
const ticks = computed(() => scaleTicks(upTo.value, WHITE_SHARE));
const hints = computed(() => stepHints(props.name, upTo.value));
</script>

<template>
  <div class="scale-legend">
    <div class="column">
      <div class="scale-na" :style="NOT_DETECTABLE_STYLE" v-hint="NA_HINT"></div>
      <div class="tick na-tick">n/a</div>
    </div>
    <div class="column scale">
      <div class="bar">
        <div class="scale-part" :style="{ flex: WHITE_SHARE }" v-hint="zeroHint"></div>
        <div
          v-for="(step, index) in steps"
          :key="step.upTo"
          class="scale-part"
          :style="{ backgroundColor: step.colour }"
          v-hint="hints[index]"
        ></div>
      </div>
      <div class="ticks">
        <span v-for="tick in ticks" :key="tick.label" class="tick" :style="{ left: `${tick.left}%` }">
          {{ tick.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scale-legend {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.column {
  display: flex;
  flex-direction: column;
}

/* The bar ends a little before the box, so 100 can be centred on its right edge. */
.scale {
  flex: 1;
  min-width: 0;
  margin-right: 9px;
}

.scale-na,
.bar {
  height: 16px;
  border: var(--border-control);
  border-radius: 4px;
}

.scale-na {
  width: 22px;
}

.bar {
  display: flex;
  overflow: hidden;
}

.scale-part {
  flex: 1;
  background-color: var(--color-technique); /* the white part: 0%, as a technique without colour */
}

.scale-part + .scale-part {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.tick {
  margin-top: 2px;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 12px;
  color: #333;
}

.na-tick {
  text-align: center;
}

.ticks {
  position: relative;
  height: 14px;
}

.ticks .tick {
  position: absolute;
  transform: translateX(-50%);
}
</style>
