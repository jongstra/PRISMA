<script setup lang="ts">
// A horizontal bar chart in a ChartCard: a title, one row per item, and optionally a legend (see ChartLegend) and a
// footnote at the bottom of the card. A row has the name on the left and the value on the right, with the bar on a grey
// track below them across the card. Used by the charts on the Insights page and on the MaGMa page's Insights and Summary
// tabs.
import ChartCard from './ChartCard.vue';
import { barWidth } from './barWidth';
import { vHint } from './hint';

export interface BarChartRow {
  name: string;
  segments: { value: number; color: string }[]; // the parts of the bar, from left to right
  label: string | number; // the value, at the end of the name line
  hint?: string; // the pink hint on the whole row, such as how its bar is split (see splitHint)
}

defineProps<{
  rows: BarChartRow[];
  max: number; // the value of a bar that fills the track
  empty?: string; // shown when there are no rows, so an empty chart does not look broken
  hint?: string; // the pink hint on the title: what the chart shows and where its numbers come from
}>();
</script>

<template>
  <ChartCard :hint="hint">
    <template #title><slot name="title" /></template>
    <div v-if="rows.length === 0 && empty" class="empty">{{ empty }}</div>
    <div v-for="(row, index) in rows" :key="index" v-hint="row.hint" class="item-row">
      <div class="item-name">
        <slot name="name" :row="row" :index="index">{{ row.name }}</slot>
      </div>
      <div class="item-value">{{ row.label }}</div>
      <div class="track">
        <div
          v-for="(segment, segmentIndex) in row.segments"
          :key="segmentIndex"
          class="bar"
          :style="{ width: barWidth(segment.value, max), backgroundColor: segment.color }"
        ></div>
      </div>
    </div>
    <div v-if="$slots.legend || $slots.footnote" class="chart-foot">
      <slot name="legend" />
      <slot name="footnote" />
    </div>
  </ChartCard>
</template>

<style scoped>
/* Name and value on one line; the track takes the next line across the card. A long name wraps, the value stays put. */
.item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 8px;
  row-gap: 1px;
  margin: 2px 8px 4px;
  line-height: 15px;
}

.item-name {
  font-size: 12.5px;
  text-align: left;
}

.item-value {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* The grey track shows how far a bar is from the maximum, for percentages 100%. */
.track {
  grid-column: 1 / -1;
  display: flex;
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--color-track);
}

.bar {
  flex: none;
}

/* The legend and the footnote sit at the bottom of the card, so the rows of cards side by side start at the same height
   and their keys line up. */
.chart-foot {
  margin-top: auto;
  padding-top: 6px;
}

.empty {
  margin: 6px 8px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
