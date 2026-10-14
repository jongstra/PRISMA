<script setup lang="ts">
// The MaGMa page: the tab bar, and below it the L1, L2 or L3 sheet, the heatmap, the insights or the summary.
import { magmaStore } from '@/stores/magma';
import SheetTabs from '@/components/magma/SheetTabs.vue';
import UseCaseTable from '@/components/magma/UseCaseTable.vue';
import Heatmap from '@/components/magma/heatmap/Heatmap.vue';
import MagmaInsights from '@/components/magma/insights/MagmaInsights.vue';
import MagmaSummary from '@/components/magma/MagmaSummary.vue';

const magma = magmaStore();

// Add the permanent IN and THR use cases (when there are no use cases yet), and update the visibility of the L3 use
// cases and their parents from the DeTT&CT visibility, which may have changed on the DeTT&CT page.
magma.initializeDefaultUseCases();
magma.updateAllL3UseCasesBasedOnDettectVisibility();
</script>

<template>
  <div class="magma-container">
    <SheetTabs />
    <UseCaseTable v-if="['L1', 'L2', 'L3'].includes(magma.activeTab)" />
    <div v-else class="scroll-container">
      <div v-if="magma.activeTab === 'Heatmap'">
        <Heatmap />
      </div>
      <div v-if="magma.activeTab === 'Insights'">
        <MagmaInsights />
      </div>
      <div v-if="magma.activeTab === 'Summary'">
        <MagmaSummary />
      </div>
    </div>
  </div>
</template>

<style scoped>
.magma-container {
  text-align: center;
}

/* The heatmap, insights and summary tabs (the sheets scroll themselves: UseCaseTable.vue). Wide content scrolls
   sideways from window edge to window edge (past the 0.5rem margin of the page, App.vue). */
.scroll-container {
  overflow-x: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}
</style>
