<script setup lang="ts">
// The score filter of the MaGMa heatmap: which scores it colours by (their product; all three together is the weight).
// The button names the score, such as 'Weight' or 'V × I', and shows it in full on hover (see scoreName.ts).
import { computed } from 'vue';
import CheckboxDropdown from '@/components/common/CheckboxDropdown.vue';
import { magmaStore } from '@/stores/magma';
import { scoreName } from './scoreName';

const magma = magmaStore();

const FIELDS = {
  visibility: 'heatmapVisibility',
  implementation: 'heatmapImplementation',
  effectiveness: 'heatmapEffectiveness',
} as const;
type Score = keyof typeof FIELDS;
const SCORES = Object.keys(FIELDS) as Score[];

const items = computed(() =>
  SCORES.map((score) => ({
    key: score,
    label: score[0]!.toUpperCase() + score.slice(1),
    checked: magma[FIELDS[score]],
  })),
);
const name = computed(() =>
  scoreName({
    visibility: magma.heatmapVisibility,
    implementation: magma.heatmapImplementation,
    effectiveness: magma.heatmapEffectiveness,
  }),
);
const summary = computed(() => name.value.short[0]!.toUpperCase() + name.value.short.slice(1));

function change(score: string, checked: boolean) {
  magma[FIELDS[score as Score]] = checked;
}
</script>

<template>
  <CheckboxDropdown :summary="summary" :items="items" :hint="name.long" @change="change" />
</template>
