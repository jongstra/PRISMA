<script setup lang="ts">
import { computed } from 'vue';
import HeatmapButton from './HeatmapButton.vue';
import { tacticsStore, type Tactic, type Technique } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import { tacticScore } from '@/domain/magma/heatmap';
import { isDetectable } from '@/domain/attack/visibility';
import { NOT_DETECTABLE_STYLE } from '@/components/common/notDetectableStyle';
import { vHint } from '@/components/common/hint';
import { heatmapFill } from './heatmapFill';
import { scoreName } from './scoreName';
import { tacticScoreHint } from './tacticScoreHint';

const props = defineProps<{ tactic: Tactic; techniques: Technique[] }>();

const store = tacticsStore();
const magma = magmaStore();

// The score of the tactic in a chip in the colour of the heatmap: the average over all its techniques, those without
// use cases as 0% (domain/magma/heatmap.ts), whatever the filters show, like the number of techniques. No chip while no
// score is ticked; its hint also gives the average over the techniques with use cases (tacticScoreHint.ts).
const metrics = computed(() => ({
  visibility: magma.heatmapVisibility,
  implementation: magma.heatmapImplementation,
  effectiveness: magma.heatmapEffectiveness,
}));
const score = computed(() =>
  tacticScore(
    props.tactic.techniques.map((technique) => ({
      useCases: magma.l3UseCasesForTechnique(technique.external_id, store.domain),
      detectable: isDetectable(technique),
    })),
    metrics.value,
  ),
);
// The name of the score in the hint, written out: 'weight' for all three, otherwise 'implementation × effectiveness'.
const writtenOutName = computed(() => {
  const name = scoreName(metrics.value);
  return name.short === 'weight' ? name.short : name.long;
});
const chip = computed(() => {
  const current = score.value;
  if (!current) {
    return null;
  }
  return {
    text: current.value === null ? 'n/a' : `${Math.round(current.value)}%`,
    style: current.value === null ? NOT_DETECTABLE_STYLE : heatmapFill(current.value),
    hint: tacticScoreHint(current, writtenOutName.value, props.tactic.techniques.length - current.techniques),
  };
});
</script>

<template>
  <div class="button-column">
    <!-- Tactic, frozen at the top of the matrix with its numbers -->
    <div class="column-header">
      <div class="button-column-tactic-name-div">
        <p class="button-column-tactic-name">{{ tactic.name }}</p>
      </div>

      <!-- The number of techniques, and the score of the tactic in a chip in the colour of the heatmap -->
      <div class="button-column-stats-div">
        <p class="button-column-stats">
          {{ tactic.techniques.length }} techniques
          <span v-if="chip" v-hint="chip.hint" class="score-chip" :style="chip.style">{{ chip.text }}</span>
        </p>
      </div>
    </div>

    <!-- Techniques column -->
    <div v-for="technique in techniques" :key="technique.external_id">
      <HeatmapButton :technique="technique" />
    </div>
  </div>
</template>

<style scoped>
/* As high as the highest column (the columns stretch in the matrix), so the frozen header below stays in view while the
   techniques of a short column have scrolled away. */
.button-column {
  display: grid;
  height: 100%;
  align-content: start;
}

/* The tactic name and its numbers stay at the top of the matrix while it scrolls down (useScrollArea.ts), on white over
   the techniques, with a line and a soft shadow below them once the matrix is scrolled. The header reaches over the 3px
   between the columns, so the line runs through. */
.column-header {
  position: sticky;
  top: 0;
  z-index: 1002; /* above a technique under the mouse (1001) */
  margin-right: -3px;
  padding-right: 3px;
  background-color: white;
}

.scrolled .column-header {
  box-shadow:
    0 1px 0 var(--color-header-line),
    0 5px 4px -3px rgba(0, 0, 0, 0.18);
}

.button-column-tactic-name-div,
.button-column-stats-div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 132px: with the technique buttons (HeatmapButton.vue) as wide and 3px between the columns, the 14 columns of
   Enterprise fit a Full HD window (1920px), with 14px to spare. 34px high: just enough for a name in two lines, so the
   frozen header takes little room. */
.button-column-tactic-name {
  align-content: flex-end;
  height: 34px;
  width: 132px;
  margin-bottom: 2px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
}

/* The number of techniques and the score of the tactic on one line: the score in a chip in the colour of the heatmap,
   like the visibility chip of the DeTT&CT matrix (TacticColumn.vue). */
.button-column-stats {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
  font-size: 12px;
  white-space: nowrap;
}

.score-chip {
  padding: 0 4px;
  border: var(--border-control);
  border-radius: 4px;
  background-color: var(--color-technique);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
}
</style>
