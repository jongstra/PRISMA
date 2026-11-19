<script setup lang="ts">
import TechniqueButton from './TechniqueButton.vue';
import type { Tactic, Technique } from '@/stores/tactics';
import { averageVisibilityPercentage } from '@/domain/attack/visibility';
import { vHint } from '../common/hint';
import { NOT_DETECTABLE_STYLE } from '../common/notDetectableStyle';
import { visibilityColour } from './visibilityColour';

const TACTIC_VISIBILITY_HINT =
  "The average visibility of this tactic's techniques; techniques that ATT&CK lists no data components for are left out.";

defineProps<{ tactic: Tactic; techniques: Technique[] }>();

// Visibility of a tactic: the average over its techniques that can be detected via data sources.
const tacticVisibility = (tactic: Tactic) => {
  const percentage = averageVisibilityPercentage(tactic.techniques);
  return percentage === null ? 'n/a' : `${Math.round(percentage)}%`;
};

// Its chip in the colour of the matrix: white for 0%, striped (n/a) when none of its techniques can be detected.
const visibilityChipStyle = (tactic: Tactic) => {
  const percentage = averageVisibilityPercentage(tactic.techniques);
  return percentage === null ? NOT_DETECTABLE_STYLE : visibilityColour(percentage / 100);
};
</script>

<template>
  <div ref="buttonColumnRef" class="button-column">
    <!-- Tactic, frozen at the top of the matrix with its numbers -->
    <div class="column-header">
      <div class="button-column-tactic-name-div">
        <p class="button-column-tactic-name">{{ tactic.name }}</p>
      </div>

      <!-- The number of techniques, and the visibility of the tactic in a chip in the colour of the matrix -->
      <div class="button-column-stats-div">
        <p class="button-column-stats">
          {{ tactic.techniques.length }} techniques
          <span v-hint="TACTIC_VISIBILITY_HINT" class="visibility-chip" :style="visibilityChipStyle(tactic)">
            {{ tacticVisibility(tactic) }}
          </span>
        </p>
      </div>
    </div>

    <!-- Techniques column -->
    <div v-for="(technique, index) in techniques" :key="index">
      <TechniqueButton :technique="technique" />
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

/* 132px: with the technique buttons (TechniqueButton.vue) as wide and 3px between the columns, the 14 columns of
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

/* The number of techniques and the visibility of the tactic on one line: the visibility in a chip in the colour of the
   matrix, like the visibility chips in a technique's tooltip (TechniqueTooltip.vue). */
.button-column-stats {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
  font-size: 12px;
  white-space: nowrap;
}

.visibility-chip {
  padding: 0 4px;
  border: var(--border-control);
  border-radius: 4px;
  background-color: var(--color-technique);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 15px;
}
</style>
