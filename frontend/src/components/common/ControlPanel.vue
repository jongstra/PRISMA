<script setup lang="ts">
// A control panel: a grey frame with a grid of boxes (ControlBox.vue, SelectionTool.vue) 3px apart, as wide as the
// navigation and domain buttons (App.vue). The rows are 64px: room for a search field with two rows of selected groups
// or components below it, so a row keeps its height however many are selected. The page sets the columns. Used by the
// DeTT&CT page and the MaGMa heatmap.
</script>

<template>
  <div class="control-panel"><slot /></div>
</template>

<style scoped>
.control-panel {
  display: grid;
  grid-auto-rows: minmax(64px, auto);
  gap: 3px;
  max-width: 960px;
  padding: 3px;
  border: var(--border-frame);
  border-radius: var(--radius-frame);
  background-color: var(--color-panel);
  text-align: left;
}
</style>
