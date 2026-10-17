<script setup lang="ts">
import InsightNumberUseCasesPerLayer from './InsightNumberUseCasesPerLayer.vue';
import InsightImprovementPotentialForL3UseCases from './InsightImprovementPotentialForL3UseCases.vue';
import InsightImprovementPotentialL3UseCasesForL1UseCase from './InsightImprovementPotentialL3UseCasesForL1UseCase.vue';
import InsightMostFrequentlyLinkedAttackTechniques from './InsightMostFrequentlyLinkedAttackTechniques.vue';
import InsightNumberOfUseCasesPerDataSource from './InsightNumberOfUseCasesPerDataSource.vue';
import InsightNumberOfUniqueAttackTechniquesPerDataSource from './InsightNumberOfUniqueAttackTechniquesPerDataSource.vue';
import InsightDataSourceMeanVisibility from './InsightDataSourceMeanVisibility.vue';
import InsightDataSourceMeanImplementation from './InsightDataSourceMeanImplementation.vue';
import InsightDataSourceMeanEffectiveness from './InsightDataSourceMeanEffectiveness.vue';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
const store = tacticsStore();
const magma = magmaStore();
</script>

<template>
  <div class="magma-insights">
    <InsightNumberUseCasesPerLayer />
    <InsightNumberOfUseCasesPerDataSource />
    <InsightNumberOfUniqueAttackTechniquesPerDataSource />
    <InsightDataSourceMeanVisibility />
    <InsightDataSourceMeanImplementation />
    <InsightDataSourceMeanEffectiveness />
    <InsightMostFrequentlyLinkedAttackTechniques />
    <InsightImprovementPotentialForL3UseCases />
    <div v-for="L1UseCase in magma.L1UseCases(store.domain)" :key="L1UseCase.uid">
      <InsightImprovementPotentialL3UseCasesForL1UseCase
        :L1UseCase="L1UseCase"
        :relatedL3UseCases="magma.getGrandChildUseCases(L1UseCase)"
      />
    </div>
  </div>
</template>

<style scoped>
/* The charts in rows of three, 10px apart, 10px below the tabs and as wide as the menu bars. */
.magma-insights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 960px;
  margin-top: 10px;
}
</style>
