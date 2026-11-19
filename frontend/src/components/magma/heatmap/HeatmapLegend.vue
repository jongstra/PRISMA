<script setup lang="ts">
// The legend of the MaGMa heatmap: n/a and the scale of the chosen score, with the green steps of heatmapFill.ts (see
// ScaleLegend.vue). 0% also covers a technique without use cases; a technique with use cases has a thick border.
import { computed } from 'vue';
import ScaleLegend from '@/components/common/ScaleLegend.vue';
import { HEATMAP_STEPS } from './heatmapFill';

const props = defineProps<{ scoreName: string }>(); // such as 'weight' or 'visibility', see scoreName.ts

const name = computed(() => props.scoreName.charAt(0).toUpperCase() + props.scoreName.slice(1));
</script>

<template>
  <ScaleLegend
    :steps="HEATMAP_STEPS"
    :name="name"
    :zero-hint="`${name} 0%, or no use cases. A thick border means the technique has use cases.`"
  />
</template>
