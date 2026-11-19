<script setup lang="ts">
// The legend of the DeTT&CT matrix: n/a and the scale of visibility, with the purple steps of visibilityColour.ts (see
// ScaleLegend.vue). Every technique has a visibility (a data source that is not in the file counts as 0%).
import ScaleLegend from '../common/ScaleLegend.vue';
import { VISIBILITY_STEPS } from './visibilityColour';
</script>

<template>
  <ScaleLegend
    :steps="VISIBILITY_STEPS"
    name="Visibility"
    zero-hint="No visibility: its data sources are not in your DeTT&CT file, or score 0."
  />
</template>
