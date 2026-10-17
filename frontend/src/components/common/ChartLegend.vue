<script setup lang="ts">
// The key of a chart whose bars have several parts: a swatch in each part's colour with its label, and optionally a
// short explanation below (the default slot). BarChart puts it at the bottom of the card.
defineProps<{ items: { label: string; color: string }[] }>();
</script>

<template>
  <div class="legend">
    <div v-for="item in items" :key="item.label" class="legend-item">
      <div class="swatch" :style="{ backgroundColor: item.color }"></div>
      {{ item.label }}
    </div>
  </div>
  <div v-if="$slots.default" class="explanation"><slot /></div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px 12px;
  margin: 0 8px 2px;
  font-size: 11px;
  line-height: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.swatch {
  width: 16px;
  height: 10px;
}

.explanation {
  margin: 0 8px 2px;
  font-size: 11px;
  color: #555555;
  text-align: center;
}
</style>
