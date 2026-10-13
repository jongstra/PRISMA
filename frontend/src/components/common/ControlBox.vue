<script setup lang="ts">
// A box in a control panel: a label at the top left, optionally a value at the top right (such as the range of a
// slider or the name of a loaded file), and the control below them. A value that does not fit is cut off with an
// ellipsis; valueHint then shows it in full when the mouse is on it. Used by the control panel of the DeTT&CT page.
import { vHint } from './hint';

defineProps<{ label: string; value?: string; valueHint?: string }>();
</script>

<template>
  <div class="control-box">
    <div class="control-label">
      <span>{{ label }}</span>
      <span v-if="value" v-hint="valueHint" class="control-value">{{ value }}</span>
    </div>
    <div class="control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.control-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 3px 6px 4px;
  border: 2px solid #555;
  border-radius: 5px;
  background-color: #ddd;
}

.control-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #333;
  white-space: nowrap;
}

/* Weights on the spans themselves: main.css sets every element to normal weight. The label keeps its width; a value
   that is too long is cut off with an ellipsis, so it always stays inside the box. */
.control-label span {
  flex: none;
  font-weight: bold;
}

.control-label .control-value {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #555;
}

/* The control fills the rest of the box, vertically centred (a slider is lower than a button). */
.control {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}
</style>
