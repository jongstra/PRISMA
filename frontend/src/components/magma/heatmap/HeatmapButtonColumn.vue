<script setup lang="ts">
import HeatmapButton from './HeatmapButton.vue';

defineProps(['tactic', 'techniques']);
</script>

<template>
  <div class="button-column">
    <!-- Tactic, frozen at the top of the matrix with its numbers -->
    <div class="column-header">
      <div class="button-column-tactic-name-div">
        <p class="button-column-tactic-name">{{ tactic.name }}</p>
      </div>

      <!-- Technique count statistic -->
      <div class="button-column-stats-div">
        <p class="button-column-stat-1">{{ tactic.techniques.length }} techniques</p>
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

.button-column-stat-1 {
  font-size: 12px;
  margin-bottom: 3px;
}
</style>
