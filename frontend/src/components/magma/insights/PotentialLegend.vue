<script setup lang="ts">
// The legend of the two improvement potential charts: the colour of each score, and how a bar is split over them (see
// potentialSegments.ts).
import { SCORE_COLORS } from '@/components/common/barColor';

const items = [
  { label: 'Visibility Potential', color: SCORE_COLORS.visibility },
  { label: 'Implementation Potential', color: SCORE_COLORS.implementation },
  { label: 'Effectiveness Potential', color: SCORE_COLORS.effectiveness },
];
</script>

<template>
  <div class="legend">
    <div v-for="item in items" :key="item.label" class="legend-item">
      <div class="swatch" :style="{ backgroundColor: item.color }"></div>
      <span>{{ item.label }}</span>
    </div>
  </div>
  <div class="explanation">Each bar is split in proportion to how far each score is from 100%.</div>
</template>

<style scoped>
.legend {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  margin-top: 5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}

.swatch {
  width: 20px;
  height: 14px;
}

.explanation {
  margin: 3px 8px 5px;
  font-size: 11px;
  color: #555555;
  text-align: center;
}
</style>
