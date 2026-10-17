<template>
  <div class="legend-container">
    <div class="legend-items">
      <div v-for="item in legendItems" :key="item.range" class="legend-item">
        <button
          :style="[{ backgroundColor: item.color, color: item.textColor }, item.style]"
          v-hint="item.title"
          class="legend-button"
        >
          {{ item.range }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '../common/notDetectableStyle';
import { vHint } from '../common/hint';

const legendItems = ref([
  {
    range: 'n/a',
    color: '',
    textColor: '#666666',
    style: NOT_DETECTABLE_STYLE,
    title: NOT_DETECTABLE_TEXT,
  },
  {
    range: '<= 1%',
    color: '',
    textColor: 'black',
  },
  {
    range: '<= 25%',
    color: '#E1BEE7',
    textColor: 'black',
  },
  {
    range: '<= 50%',
    color: '#CE93D8',
    textColor: 'black',
  },
  {
    range: '<= 75%',
    color: '#AB47BC',
    textColor: 'black',
  },
  {
    range: '<= 99%',
    color: '#7B1FA2',
    textColor: 'white',
  },
  {
    range: '> 99%',
    color: '#4A148C',
    textColor: 'white',
  },
]);
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
