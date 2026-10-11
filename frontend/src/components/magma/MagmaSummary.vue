<script setup lang="ts">
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
const store = tacticsStore();
const magma = magmaStore();

function getCoveredAttackTechniques() {
  const useCases = magma.L3UseCases(store.domain);
  const attackTechniques = new Set();
  useCases.forEach((useCase) => {
    attackTechniques.add(useCase.attackTechniqueId); // Add techniqueId to the set.
  });

  // Remove any 'none' entry from attackTechniques, if present.
  attackTechniques.delete('none');

  return attackTechniques;
}

function getUsedDataSources() {
  const useCases = magma.L3UseCases(store.domain);
  const dataSources = new Set();
  useCases.forEach((useCase) => {
    dataSources.add(useCase.dataSource); // Add dataSource to the set.
  });

  // Remove any 'none' entry from dataSources, if present.
  dataSources.delete('none');

  return dataSources;
}

function calculateMean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The means of the scores over the L1 use cases of the current domain (including IN and THR).
function getUseCaseStatistics() {
  const useCases = magma.L1UseCases(store.domain);
  const meanOf = (score: 'visibility' | 'implementation' | 'effectiveness' | 'weight' | 'potential') =>
    calculateMean(useCases.map((useCase) => Number(useCase[score])));
  return {
    meanVisibility: meanOf('visibility'),
    meanImplementation: meanOf('implementation'),
    meanEffectiveness: meanOf('effectiveness'),
    meanWeight: meanOf('weight'),
    meanPotential: meanOf('potential'),
  };
}
</script>

<template>
  <div class="magma-summary">
    <br />
    <hr />
    <br />
    <p>Mean Visibility: {{ getUseCaseStatistics().meanVisibility.toFixed(2) }}%</p>
    <p>Mean Implementation: {{ getUseCaseStatistics().meanImplementation.toFixed(2) }}%</p>
    <p>Mean Effectiveness: {{ getUseCaseStatistics().meanEffectiveness.toFixed(2) }}%</p>
    <p>Mean Weight: {{ getUseCaseStatistics().meanWeight.toFixed(2) }}%</p>
    <p>Mean Potential: {{ getUseCaseStatistics().meanPotential.toFixed(2) }}%</p>
    <br />
    <hr />
    <br />
    <p>L1 Count: {{ magma.L1UseCases(store.domain).length }}</p>
    <p>L2 Count: {{ magma.L2UseCases(store.domain).length }}</p>
    <p>L3 Count: {{ magma.L3UseCases(store.domain).length }}</p>
    <br />
    <hr />
    <br />
    <p>Covered Attack Techniques: {{ getCoveredAttackTechniques().size }}</p>
    <p>Used Data Sources: {{ getUsedDataSources().size }}</p>
  </div>
</template>

<style scoped>
.magma-insights {
  display: flex;

  flex-wrap: wrap; /* This will allow items to wrap to the next line */
  justify-content: flex-start; /* Adjust as needed to control spacing */
}
</style>
