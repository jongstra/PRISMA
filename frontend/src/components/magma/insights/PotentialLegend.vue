<script setup lang="ts">
// The legend of the two improvement potential charts: the colour of each score, and how a bar is split over them (see
// potentialSegments.ts).
import ChartLegend from '@/components/common/ChartLegend.vue';
import { SCORE_COLORS } from '@/components/common/barColor';

const items = [
  { label: 'Visibility', color: SCORE_COLORS.visibility },
  { label: 'Implementation', color: SCORE_COLORS.implementation },
  { label: 'Effectiveness', color: SCORE_COLORS.effectiveness },
];
</script>

<template>
  <ChartLegend :items="items">Split by how far each score is from 100%.</ChartLegend>
</template>
