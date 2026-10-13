<script setup lang="ts">
import VisibilityPerTactic from '@/components/insights/VisibilityPerTactic.vue';
import VisibilityPerPlatform from '@/components/insights/VisibilityPerPlatform.vue';
import NewComponentSuggester from '@/components/insights/NewComponentSuggester.vue';
import CoverageComponentSuggester from '@/components/insights/CoverageComponentSuggester.vue';
import NumberTechniquesPerTactic from '@/components/insights/NumberTechniquesPerTactic.vue';
import NumberTechniquesPerPlatform from '@/components/insights/NumberTechniquesPerPlatform.vue';
import NumberTechniquesPerGroup from '@/components/insights/NumberTechniquesPerGroup.vue';
import NumberTechniquesPerSoftware from '@/components/insights/NumberTechniquesPerSoftware.vue';
import TechniquesOccurrenceBySoftware from '@/components/insights/TechniquesOccurrenceBySoftware.vue';
import TechniquesOccurrenceByGroups from '@/components/insights/TechniquesOccurrenceByGroups.vue';
import TechniquesOccurrenceTotal from '@/components/insights/TechniquesOccurrenceTotal.vue';
</script>

<template>
  <div class="horizontal-container">
    <VisibilityPerTactic />
    <VisibilityPerPlatform />
    <NewComponentSuggester />
    <CoverageComponentSuggester />
    <NumberTechniquesPerTactic />
    <NumberTechniquesPerPlatform />
    <NumberTechniquesPerGroup />
    <NumberTechniquesPerSoftware />
    <TechniquesOccurrenceByGroups />
    <TechniquesOccurrenceBySoftware />
    <TechniquesOccurrenceTotal />
  </div>
</template>

<style scoped>
/* The charts in rows, 10px apart; the first row starts right below the menu bars, like the other pages. */
.horizontal-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
