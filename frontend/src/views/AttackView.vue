<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TacticColumn from '../components/attack/TacticColumn.vue';
import { tacticsStore } from '@/stores/tactics';
import { useEndTagHover } from '@/components/common/useTagHover';
import FileUploadButtonYaml from '@/components/attack/FileUploadButtonYaml.vue';
import TechniqueAttributeFilter from '@/components/attack/TechniqueAttributeFilter.vue';
import TechniqueVisibilityPercentageFilter from '@/components/attack/TechniqueVisibilityPercentageFilter.vue';
import TechniqueTotalOccurrenceFilterBinned from '@/components/attack/TechniqueTotalOccurrenceFilterBinned.vue';
import VisibilityLegend from '@/components/attack/VisibilityLegend.vue';
import SearchBar from '@/components/attack/SearchBar.vue';
import SelectionTool from '@/components/common/SelectionTool.vue';
import ControlBox from '@/components/common/ControlBox.vue';
import ControlPanel from '@/components/common/ControlPanel.vue';
import ScrollThumbs from '@/components/common/ScrollThumbs.vue';
import { useScrollArea } from '@/components/common/useScrollArea';
import { occurrenceLevel, visibilityRangeText } from '@/components/attack/controlValues';
const store = tacticsStore();

// Hovering a group or data component in a pinned tooltip rings its techniques, until the mouse moves off it.
useEndTagHover(() => store.currentDomain);

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

// In a big enough window the matrix fills the window below the controls and scrolls itself, with the tactic names frozen
// at its top (useScrollArea.ts).
const matrix = ref<HTMLElement | null>(null);
const matrixArea = useScrollArea(matrix);
</script>

<template>
  <!-- The controls in two rows of four equally wide boxes. Above: the two thresholds, the platforms and the file (Load
       at the top right, where the MaGMa page has Load and Save). Below: the three searches, and the legend just above
       the matrix it explains. -->
  <ControlPanel class="dettect-controls">
    <ControlBox label="Visibility %" :value="visibilityRangeText(store.minVisibilityRatio, store.maxVisibilityRatio)">
      <TechniqueVisibilityPercentageFilter />
    </ControlBox>
    <ControlBox label="Min. total occurrence" :value="occurrenceLevel(store.minTotalOccurrencesBinned)">
      <TechniqueTotalOccurrenceFilterBinned />
    </ControlBox>
    <ControlBox label="Platforms"><TechniqueAttributeFilter attribute_type="platforms" /></ControlBox>
    <ControlBox label="DeTT&CT file" :value="dettectFileName ?? 'No file loaded'" :value-hint="dettectFileName">
      <FileUploadButtonYaml />
    </ControlBox>
    <ControlBox label="Techniques"><SearchBar /></ControlBox>
    <SelectionTool
      label="Groups"
      list="groups"
      selected-field="selected"
      only-show-field="only_show_selected_groups"
      noun="group"
      toggle-title="Only show techniques used by selected groups."
      color="red"
    />
    <SelectionTool
      label="Components"
      list="data_components"
      selected-field="selected"
      only-show-field="only_show_selected_components"
      noun="component"
      toggle-title="Only show techniques covered by selected components."
      color="green"
    />
    <ControlBox
      label="Legend: visibility"
      :value="store.attackVersion ? `MITRE ATT&CK v${store.attackVersion}` : undefined"
      value-hint="The ATT&CK version of the catalog that PRISMA uses"
    >
      <VisibilityLegend />
    </ControlBox>
  </ControlPanel>

  <div ref="matrix" class="matrix-container scroll-area" :class="{ scrolled: matrixArea.scrolled }">
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
  <ScrollThumbs :area="matrixArea" />
</template>

<style scoped>
/* Two rows of four equally wide boxes (ControlPanel.vue). In a narrower window the boxes go in two columns, and in a very
   narrow one below each other. */
.dettect-controls {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 3px;
}

@media (max-width: 940px) {
  .dettect-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 580px) {
  .dettect-controls {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* The matrix scrolls from window edge to window edge (past the 0.5rem margin of the page, App.vue), starting and ending
   0.5rem from the edges. In a big enough window it also fills the window below the controls and scrolls down itself
   (.scroll-area in main.css, useScrollArea.ts). */
.matrix-container {
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}

.attack-matrix {
  display: flex;
  width: fit-content; /* Allow content to take up natural width */
}

.button-columns {
  flex: 1; /* Allow components to grow and take up available space */
  width: auto; /* Allow components to take their natural width */
  margin-right: 3px; /* 3px between the columns, so 14 Enterprise columns fit Full HD (TacticColumn.vue) */
}
</style>
