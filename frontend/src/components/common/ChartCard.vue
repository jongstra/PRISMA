<script setup lang="ts">
// The frame of a chart or summary card: a grey title strip, like the control boxes, above the content. Used by
// BarChart and the cards on the MaGMa page's Summary tab; the page around them spaces them (10px). Three cards and their
// two gaps are as wide as the menu bars (960px).
</script>

<template>
  <div class="chart-card">
    <div class="title">
      <slot name="title" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
/* The same border as the control panels. A column, so a footnote with margin-top: auto sits at the bottom. */
.chart-card {
  display: flex;
  flex-direction: column;
  width: calc((960px - 2 * 10px) / 3);
  padding-bottom: 4px;
  overflow: hidden;
  border: 2px solid black;
  border-radius: 5px;
}

.title {
  margin-bottom: 4px;
  padding: 5px 6px;
  border-bottom: 1.5px solid #333;
  background: #ddd;
  text-align: center;
  font-size: 13px;
  line-height: 16px;
  font-weight: bold;
}
</style>
