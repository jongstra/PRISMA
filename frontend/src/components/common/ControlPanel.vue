<script setup lang="ts">
// A control panel: a grey frame with a grid of boxes (ControlBox.vue, SelectionTool.vue) 3px apart, as wide as the
// navigation and domain buttons (App.vue). The rows are at least 60px: room for one line of selected groups or data
// components; a row grows for a second line. The page sets the columns. Used by the DeTT&CT page and the MaGMa heatmap.
</script>

<template>
  <div class="control-panel"><slot /></div>
</template>

<style scoped>
.control-panel {
  display: grid;
  grid-auto-rows: minmax(60px, auto);
  gap: 3px;
  max-width: 960px;
  padding: 3px;
  border: 2px solid black;
  border-radius: 5px;
  background-color: #ccc;
  text-align: left;
}
</style>
