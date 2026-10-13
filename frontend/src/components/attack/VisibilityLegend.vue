<template>
  <div class="legend-container">
    <div class="legend-items">
      <div v-for="item in legendItems" :key="item.range" class="legend-item">
        <button
          :style="[{ backgroundColor: item.color, color: item.textColor }, item.style]"
          :title="item.title"
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
/* The swatches spread over the width of the box (the label is in the ControlBox around the legend). */
.legend-items {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.legend-button {
  width: 29px;
  height: 30px;
  padding: 0;
  border: 1.5px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
  line-height: 1.15;
}
</style>
