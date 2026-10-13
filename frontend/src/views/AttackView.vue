<script setup lang="ts">
import { computed, watch } from 'vue';
import TacticColumn from '../components/attack/TacticColumn.vue';
import { tacticsStore } from '@/stores/tactics';
import FileUploadButtonYaml from '@/components/attack/FileUploadButtonYaml.vue';
import TechniqueAttributeFilter from '@/components/attack/TechniqueAttributeFilter.vue';
import TechniqueVisibilityPercentageFilter from '@/components/attack/TechniqueVisibilityPercentageFilter.vue';
import TechniqueTotalOccurrenceFilterBinned from '@/components/attack/TechniqueTotalOccurrenceFilterBinned.vue';
import VisibilityLegend from '@/components/attack/VisibilityLegend.vue';
import SearchBar from '@/components/attack/SearchBar.vue';
import SelectionTool from '@/components/common/SelectionTool.vue';
import ControlBox from '@/components/common/ControlBox.vue';
import { occurrenceLevel, visibilityRangeText } from '@/components/attack/controlValues';
const store = tacticsStore();

// The name of the DeTT&CT file loaded for the current domain, if any.
const dettectFileName = computed(() => store.dettectFileNames[store.domain]);

// When the domain is changed, we want to unpin any pinned tooltips for cleanliness,
// and clear the technique filter search box text.
watch(
  () => store.domain,
  () => {
    store.pinnedTooltipId = '';
    store.searchQuery = '';
  },
);

// The matrix columns are keyed by domain and tactic, so switching domains creates new columns: each column and
// technique button keeps the domain it was created for.
</script>

<template>
  <!-- The controls: the file, the platforms, the technique search and the legend; below them the filters and the
       group and data component selections. The columns of the two rows line up. -->
  <div class="combined-controls">
    <ControlBox label="DeTT&CT file" :value="dettectFileName ?? 'No file loaded'" :value-hint="dettectFileName">
      <FileUploadButtonYaml />
    </ControlBox>
    <ControlBox label="Platforms"><TechniqueAttributeFilter attribute_type="platforms" /></ControlBox>
    <ControlBox label="Techniques"><SearchBar /></ControlBox>
    <ControlBox label="Legend: visibility"><VisibilityLegend /></ControlBox>
    <ControlBox label="Visibility %" :value="visibilityRangeText(store.minVisibilityRatio, store.maxVisibilityRatio)">
      <TechniqueVisibilityPercentageFilter />
    </ControlBox>
    <ControlBox label="Min. total occurrence" :value="occurrenceLevel(store.minTotalOccurrencesBinned)">
      <TechniqueTotalOccurrenceFilterBinned />
    </ControlBox>
    <SelectionTool
      list="groups"
      selected-field="selected"
      only-show-field="only_show_selected_groups"
      noun="group"
      toggle-title="Only show techniques used by selected groups."
      color="red"
    />
    <SelectionTool
      list="data_components"
      selected-field="selected"
      only-show-field="only_show_selected_components"
      noun="component"
      toggle-title="Only show techniques covered by selected components."
      color="green"
    />
  </div>

  <div class="matrix-container">
    <div class="attack-matrix">
      <div
        v-for="tactic in store.currentDomain?.tactics"
        :key="`${store.domain}|${tactic.name}`"
        class="button-columns"
      >
        <TacticColumn :tactic="tactic" :techniques="tactic.techniques" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Two rows of four boxes; the group and data component boxes keep their own width (SelectionTool.vue) and grow with
   their selected items. The panel is as wide as the navigation and domain buttons above it (App.vue). */
.combined-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 265px 265px;
  /* Both rows are 60px: room for one line of selected groups or data components; the bottom row grows for a second. */
  grid-template-rows: minmax(60px, auto) minmax(60px, auto);
  gap: 3px;
  max-width: 960px;
  margin-bottom: 3px;
  padding: 3px;
  border: 2px solid black;
  border-radius: 5px;
  background-color: #ccc;
}

.matrix-container {
  overflow-x: auto; /* Enable horizontal scrollbar */
  width: 100%; /* Full width of the parent container */
  transform: rotateX(180deg); /* Rotates container upside down so the horizontal scrollbar is at the top. */
}

.attack-matrix {
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
