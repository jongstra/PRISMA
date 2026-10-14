<script setup lang="ts">
import { computed } from 'vue';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import HeatmapButtonColumn from './HeatmapButtonColumn.vue';
import HeatmapScoreFilter from './HeatmapScoreFilter.vue';
import HeatmapSliderFilter from './HeatmapSliderFilter.vue';
import HeatmapSearchBar from './HeatmapSearchBar.vue';
import HeatmapLegend from './HeatmapLegend.vue';
import SelectionTool from '@/components/common/SelectionTool.vue';
import ControlPanel from '@/components/common/ControlPanel.vue';
import ControlBox from '@/components/common/ControlBox.vue';
import { scoreName } from './scoreName';
const store = tacticsStore();
const magma = magmaStore();

// The legend is labelled with the score the heatmap colours by, such as 'Legend: weight %'.
const legendLabel = computed(() => {
  const metrics = {
    visibility: magma.heatmapVisibility,
    implementation: magma.heatmapImplementation,
    effectiveness: magma.heatmapEffectiveness,
  };
  return Object.values(metrics).some(Boolean) ? `Legend: ${scoreName(metrics).short} %` : 'Legend';
});

// The matrix columns are keyed by domain and tactic, so switching domains creates new columns: each column and
// technique button keeps the domain it was created for.
</script>

<template>
  <div>
    <!-- The controls in one row, in the style of the DeTT&CT page: the score, the minimum score, the technique search,
         the groups and the legend. -->
    <ControlPanel class="heatmap-controls">
      <ControlBox label="Score"><HeatmapScoreFilter /></ControlBox>
      <ControlBox label="Min. score %" :value="String(magma.heatmapFilterValue)"><HeatmapSliderFilter /></ControlBox>
      <ControlBox label="Techniques"><HeatmapSearchBar /></ControlBox>
      <SelectionTool
        list="groups"
        selected-field="selectedInMagmaHeatmap"
        only-show-field="only_show_selected_groups_magma_heatmap"
        noun="group"
        toggle-title="Only show techniques used by selected groups."
        color="red"
      />
      <ControlBox class="legend-box" :label="legendLabel"><HeatmapLegend /></ControlBox>
    </ControlPanel>
    <div class="heatmap-container">
      <div class="heatmap">
        <div
          v-for="tactic in store.currentDomain?.tactics"
          :key="`${store.domain}|${tactic.name}`"
          class="button-columns"
        >
          <HeatmapButtonColumn :tactic="tactic" :techniques="tactic.techniques" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* One row, wide enough for every text: the score button fits 'Implementation', the legend fits 'none'. In a narrower
   window the boxes go in two columns (the legend over both), and in a very narrow one below each other. */
.heatmap-controls {
  grid-template-columns: 170px 116px minmax(0, 1fr) 240px 238px;
  margin: 5px 0 3px;
}

/* The group box fills its column (it is 265px on the DeTT&CT page). */
.heatmap-controls > .selection-container {
  width: auto;
}

@media (max-width: 940px) {
  .heatmap-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .heatmap-controls > .legend-box {
    grid-column: 1 / -1;
  }
}

@media (max-width: 580px) {
  .heatmap-controls {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* The heatmap scrolls sideways from window edge to window edge, like the sheets around it (MagmaView.vue). */
.heatmap-container {
  overflow-x: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
  transform: rotateX(180deg); /* Rotates container upside down so the horizontal scrollbar is at the top. */
}

.heatmap {
  display: flex;
  width: fit-content; /* Allow content to take up natural width */
  transform: rotateX(
    180deg
  ); /* Rotates the matrix content upside down AGAIN (after doing this to the .matrix-container), so it rotated back to normal. */
}

.button-columns {
  flex: 1; /* Allow components to grow and take up available space */
  width: auto; /* Allow components to take their natural width */
  margin-right: 4px; /* Adjust spacing between components */
}
</style>
