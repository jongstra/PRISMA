<script setup lang="ts">
// The Summary tab of the MaGMa page: how well attacks are detected early (cumulative IN and THROUGH), the chance of
// missing an attack per business risk, the averages over the business risks, and the counts (see domain/magma/summary.ts).
import { computed } from 'vue';
import BarChart from '@/components/common/BarChart.vue';
import { barColor } from '@/components/common/barColor';
import { average, businessRisks, cumulativeUseCases, distinctCount } from '@/domain/magma/summary';
import { magmaStore } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';

const store = tacticsStore();
const magma = magmaStore();

const l1UseCases = computed(() => magma.L1UseCases(store.domain));
const l3UseCases = computed(() => magma.L3UseCases(store.domain));
const cumulative = computed(() => cumulativeUseCases(l1UseCases.value));
const risks = computed(() => businessRisks(l1UseCases.value));

// One decimal everywhere on this tab: enough for an overview, and the averages stay aligned.
const percent = (value: number) => `${value.toFixed(1)}%`;

// One bar per cumulative use case: its weight, from red (0%) to green (100%).
const earlyRows = computed(() =>
  cumulative.value.map((useCase) => {
    const weight = useCase.weight ?? 0;
    return { name: useCase.name, segments: [{ value: weight, color: barColor(weight) }], label: percent(weight) };
  }),
);

// One bar per business risk: its risk, from green (0%) to red (100%), because a high risk is bad.
const riskRows = computed(() =>
  risks.value.map((useCase) => {
    const risk = useCase.risk ?? 0;
    return { name: useCase.name, segments: [{ value: risk, color: barColor(100 - risk) }], label: percent(risk) };
  }),
);

const SCORES = [
  ['visibility', 'Visibility'],
  ['implementation', 'Implementation'],
  ['effectiveness', 'Effectiveness'],
  ['weight', 'Weight'],
  ['potential', 'Potential'],
  ['risk', 'Risk'],
] as const;

// The averages over the business risks only: cumulative IN and THROUGH already count in each risk.
const averages = computed(() =>
  SCORES.map(([field, label]) => {
    const value = average(risks.value.map((useCase) => useCase[field]));
    return { label, value: value === null ? '–' : percent(value) };
  }),
);

const counts = computed(() => [
  { label: 'L1 use cases', value: l1UseCases.value.length },
  { label: 'L2 use cases', value: magma.L2UseCases(store.domain).length },
  { label: 'L3 use cases', value: l3UseCases.value.length },
  { label: 'Techniques covered', value: distinctCount(l3UseCases.value.map((useCase) => useCase.attackTechniqueId)) },
  { label: 'Data sources used', value: distinctCount(l3UseCases.value.map((useCase) => useCase.dataSource)) },
]);
</script>

<template>
  <div class="magma-summary">
    <BarChart :rows="earlyRows" :max="100" label="inside" label-space="55px" :name-width="210" wrap-long-names>
      <template #title>Early detection (cumulative weight)</template>
      <template #name="{ index }">
        <span class="use-case-id">{{ cumulative[index]!.id }}</span> {{ cumulative[index]!.name }}
      </template>
      <template #footnote>
        <div class="footnote">Counts in every business risk, by its IN and THR impact.</div>
      </template>
    </BarChart>

    <div class="card">
      <div class="title">Business risks: averages</div>
      <hr />
      <dl class="averages">
        <template v-for="score in averages" :key="score.label">
          <dt>{{ score.label }}</dt>
          <dd>{{ score.value }}</dd>
        </template>
      </dl>
      <div class="footnote">
        Over the {{ risks.length }} business risk{{ risks.length === 1 ? '' : 's' }}; IN and THR are left out.
      </div>
    </div>

    <BarChart
      class="wide"
      :rows="riskRows"
      :max="100"
      label="inside"
      label-space="55px"
      :name-width="230"
      wrap-long-names
    >
      <template #title>Business risks: chance of missing an attack (highest first)</template>
      <template #name="{ index }">
        <span class="use-case-id">{{ risks[index]!.id }}</span> {{ risks[index]!.name }}
      </template>
      <template #footnote>
        <div v-if="risks.length === 0" class="empty">No business risks yet. Add one on the L1 tab.</div>
        <div class="footnote">The Risk column of the L1 sheet.</div>
      </template>
    </BarChart>

    <div class="card wide">
      <div class="title">Counts</div>
      <hr />
      <div class="counts">
        <div v-for="count in counts" :key="count.label">
          <div class="count">{{ count.value }}</div>
          {{ count.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Two columns of cards as wide as the charts, 10px apart and 10px below the tabs; the wide cards take both. */
.magma-summary {
  display: grid;
  grid-template-columns: repeat(2, 450px);
  gap: 10px;
  margin-top: 10px;
}

.magma-summary .wide {
  grid-column: 1 / -1;
  width: auto;
}

/* The same frame and title as the charts (see BarChart.vue). */
.card {
  display: flex;
  flex-direction: column;
  border: 2px solid black;
  border-radius: 5px;
}

.title {
  text-align: center;
  margin: 5px;
  font-size: 16px;
  font-weight: bold;
}

.averages {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  margin: 5px 40px;
  font-size: 13px;
}

.averages dd {
  margin: 0;
  font-weight: bold;
  text-align: right;
}

.counts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin: 5px 5px 10px;
  font-size: 13px;
  text-align: center;
}

.count {
  font-size: 20px;
  font-weight: bold;
}

/* Bold needs its own class: main.css sets every element, also <b>, to normal weight. */
.use-case-id {
  font-weight: bold;
}

.footnote {
  margin: auto 8px 6px;
  font-size: 11px;
  color: #555555;
  text-align: center;
}

.empty {
  margin: 10px 8px;
  font-size: 13px;
  text-align: center;
}
</style>
