<script setup lang="ts">
// A horizontal bar chart in a ChartCard: a title, optionally a legend, one row per item (name, bar, label), optionally a
// footnote. Used by the charts on the Insights page and on the MaGMa page's Insights and Summary tabs.
import ChartCard from './ChartCard.vue';
import { barWidth } from './barWidth';

export interface BarChartRow {
  name: string;
  segments: { value: number; color: string }[]; // the parts of the bar, from left to right
  label: string | number; // the text next to (or in) the bar
}

withDefaults(
  defineProps<{
    rows: BarChartRow[];
    max: number; // the value of a bar that fills the box
    labelSpace?: string; // room kept for the label next to the longest bar (see barWidth)
    nameWidth?: number; // minimum width of the name column, in pixels
    label?: 'after' | 'inside' | 'inside-wide' | 'end'; // after the bar, in the bar, in the bar and 90px wide, or at the row's end
    wrapLongNames?: boolean; // let long names wrap, instead of making the bars shorter
    empty?: string; // shown when there are no rows, so an empty chart does not look broken
  }>(),
  {
    labelSpace: '40px',
    nameWidth: 170,
    label: 'after',
    wrapLongNames: false,
  },
);
</script>

<template>
  <ChartCard>
    <template #title><slot name="title" /></template>
    <slot name="legend" />
    <div v-if="rows.length === 0 && empty" class="empty">{{ empty }}</div>
    <div v-for="(row, index) in rows" :key="index" class="item-row">
      <div class="item-name" :style="{ minWidth: `${nameWidth}px` }">
        <slot name="name" :row="row" :index="index">{{ row.name }}</slot>
      </div>
      <div class="bar-container" :class="{ 'wrap-names': wrapLongNames }">
        <div
          v-for="(segment, segmentIndex) in row.segments"
          :key="segmentIndex"
          class="bar"
          :style="{ width: barWidth(segment.value, max, labelSpace), backgroundColor: segment.color }"
        >
          <template v-if="segmentIndex === row.segments.length - 1">
            <span v-if="label === 'inside'" class="item-count inside">{{ row.label }}</span>
            <span v-else-if="label === 'inside-wide'" class="item-val">{{ row.label }}</span>
          </template>
        </div>
        <span v-if="label === 'after'" class="item-count">{{ row.label }}</span>
      </div>
      <span v-if="label === 'end'" class="item-count">{{ row.label }}</span>
    </div>
    <slot name="footnote" />
  </ChartCard>
</template>

<style scoped>
.item-row {
  display: flex;
  align-items: center;
  margin: 3px 6px;
}

.empty {
  margin: 6px 8px;
  font-size: 13px;
  color: #555555;
  text-align: center;
}

.item-name {
  text-align: right;
  padding-right: 10px;
  font-size: 13px;
}

.bar-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  position: relative;
  height: 14px;
}

/* The bars take the full row width, so a long name wraps instead of pushing the bars aside. */
.bar-container.wrap-names {
  flex-grow: 0;
  width: 100%;
}

.bar {
  height: 14px;
  position: relative;
}

.item-count {
  margin-left: 4px;
  font-size: 12px;
}

.item-count.inside {
  position: absolute;
  left: 100%;
}

.item-val {
  display: inline-block;
  position: absolute;
  left: 100%;
  font-size: 12px;
  width: 90px;
}
</style>
