<script setup lang="ts">
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import { ref, computed } from 'vue';
import { ancestorCounts, heatmapValue } from '@/domain/magma/heatmap';
import { isDetectable } from '@/domain/attack/visibility';
import { NOT_DETECTABLE_STYLE } from '@/components/common/notDetectableStyle';
import TechniqueTag from '@/components/common/TechniqueTag.vue';
import TechniqueTooltip from '@/components/common/TechniqueTooltip.vue';
import { useTechniqueTooltip } from '@/components/common/useTechniqueTooltip';

const store = tacticsStore();
const props = defineProps(['technique']);
const magma = magmaStore();

// The heatmap only shows technique buttons once the catalog is loaded, so the domain exists here.
const domain = store.currentDomain!;

const buttonRef = ref<HTMLElement | null>(null);
const { open: tooltipOpen, pinned, show: showTooltip, hide: hideTooltip, togglePin, unpin } = useTechniqueTooltip();

// The L3 use cases in the current domain that detect this technique or one of its sub-techniques.
const relatedUseCases = computed(() => magma.l3UseCasesForTechnique(props.technique.external_id, store.domain));

// The heatmap value (0-100) for the metrics selected with the checkboxes, or null when there is nothing to show.
const value = computed(() =>
  heatmapValue(relatedUseCases.value, {
    visibility: magma.heatmapVisibility,
    implementation: magma.heatmapImplementation,
    effectiveness: magma.heatmapEffectiveness,
  }),
);

function getBackgroundColor() {
  return value.value === null ? undefined : `rgba(0, 255, 0, ${value.value / 100})`;
}

// Techniques without use cases that ATT&CK lists no data components for are striped, as in the DeTT&CT matrix: a known
// blind spot. Techniques with use cases are coloured by their heatmap value (and marked with a thicker border).
function getButtonStyle() {
  if (relatedUseCases.value.length === 0 && !isDetectable(props.technique)) {
    return NOT_DETECTABLE_STYLE;
  }
  return { backgroundColor: getBackgroundColor() };
}

// The numbers in the tooltip: the heatmap value of each score and of all three together (the weight), and how many use
// cases at each level are related to the technique.
const scores = computed(() => {
  const percentage = (visibility: boolean, implementation: boolean, effectiveness: boolean) =>
    `${(heatmapValue(relatedUseCases.value, { visibility, implementation, effectiveness }) ?? 0).toFixed(0)}%`;
  return [
    ['Weight', percentage(true, true, true)],
    ['Visibility', percentage(true, false, false)],
    ['Implementation', percentage(false, true, false)],
    ['Effectiveness', percentage(false, false, true)],
  ];
});
const useCaseCounts = computed(() => {
  const useCases = relatedUseCases.value;
  const onSubTechniques = useCases.filter(
    (useCase) => useCase.attackTechniqueId !== props.technique.external_id,
  ).length;
  return { l3: useCases.length, onSubTechniques, ...ancestorCounts(useCases, magma.useCases) };
});

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const isGroupSelected = (name: string) =>
  !!domain.groups.find((group: { name: string }) => group.name === name)?.selected;

const showButton = computed(() => {
  // The heatmap value of the technique (based on the heatmap style checkmarks); 0 when there are no related use cases.
  const currentValue = value.value ?? 0;

  // Compute whether the button should be shown based on its current value (based on the heatmap style checkmarks) and the heatmapFilterValue.
  const valueFilterResult = currentValue >= magma.heatmapFilterValue;

  const searchQueryFilterResult =
    !magma.heatmapSearchQuery || // There is no search query.
    props.technique.name.toLowerCase().includes(magma.heatmapSearchQuery.toLowerCase()) || // The search query matches on the technique name.
    props.technique.external_id.toLowerCase().includes(magma.heatmapSearchQuery.toLowerCase()); // The search query matches on the technique ID.

  // When the group tool mask toggle (domain.only_show_selected_groups_magma_heatmap) is switch to 'true', we want to hide all techniques that are not covered by the selected groups.
  const groupMaskFilterResult = !(
    domain.only_show_selected_groups_magma_heatmap &&
    !store.selectedGroupsTechniquesSetMagmaHeatmap.has(props.technique.name)
  );

  return valueFilterResult && searchQueryFilterResult && groupMaskFilterResult;
});

const occursInSelectedGroups = () => {
  if (store.selectedGroupsTechniquesSetMagmaHeatmap.has(props.technique.name)) {
    return true;
  } else {
    return false;
  }
};
</script>

<template>
  <button
    v-if="showButton"
    ref="buttonRef"
    :style="getButtonStyle()"
    @click="togglePin"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    :class="{
      pinned,
      'occurs-in-selected-groups': occursInSelectedGroups(),
      'has-use-cases': relatedUseCases.length > 0,
    }"
  >
    <span class="buttontext">{{ technique.name }}</span>
  </button>

  <!-- The tooltip, shown next to the button -->
  <TechniqueTooltip
    v-if="tooltipOpen"
    :anchor="buttonRef"
    :pinned="pinned"
    :name="technique.name"
    :external-id="technique.external_id"
    @unpin="unpin"
  >
    <div class="tt-section">
      <div v-for="[label, score] in scores" :key="label" class="tt-row">
        <span>{{ label }}</span>
        <span class="tt-number">{{ score }}</span>
      </div>
      <div v-if="!isDetectable(technique)" class="tt-note">
        Not detectable via data sources: ATT&CK lists no data components for this technique.
      </div>
    </div>

    <div class="tt-section">
      <div class="tt-label">Related use cases</div>
      {{ useCaseCounts.l3 }} L3 · {{ useCaseCounts.l2 }} L2 · {{ useCaseCounts.l1 }} L1
      <div v-if="useCaseCounts.onSubTechniques > 0" class="tt-note">
        {{ plural(useCaseCounts.onSubTechniques, 'L3 use case is', 'L3 use cases are') }} on sub-techniques.
      </div>
    </div>

    <div class="tt-section">
      <div class="tt-label">Used by</div>
      {{ plural(technique.occurrence_groups, 'group', 'groups') }} · {{ technique.occurrence_software }} software ·
      {{ technique.occurrence_total }} in total
    </div>

    <div class="tt-section">
      <div class="tt-label">Groups ({{ technique.groups.length }})</div>
      <div v-if="technique.groups.length" class="tt-tags">
        <TechniqueTag
          v-for="group in technique.groups"
          :key="group"
          :name="group"
          kind="group"
          :selected="isGroupSelected(group)"
        />
      </div>
      <span v-else class="tt-none">None</span>
    </div>
  </TechniqueTooltip>
</template>

<style scoped>
/* Like the DeTT&CT matrix buttons (TechniqueButton.vue): an inner red line and an outer ring as variables. */
button {
  --inner-line: 0 0 transparent;
  --outer-ring: 0 0 transparent;
  display: block; /* not on a line of text: Safari places a button's text baseline differently, which shifted the columns */
  margin-inline: auto; /* centred in its column */
  margin-top: 0px;
  margin-bottom: 3px;
  background-color: rgb(255, 255, 255);
  border: 1.5px solid var(--color-control-border);
  box-shadow: var(--inner-line), var(--outer-ring);
  border-radius: 4px; /* Slightly rounded corners */
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease; /* Smooth transition for hover effects */
  position: relative; /* Ensure the button's stacking context is isolated */
}

button:hover,
button.pinned {
  --outer-ring:
    rgba(0, 0, 0, 0.16) 0px 1px 3px, rgb(51, 51, 51) 0px 0px 0px 2.5px; /* On hover, a dark ring around the button. */
  z-index: 1001;
}

/* Techniques with L3 use cases get a thicker (3.5px) dark border, so a technique with use cases at 0% still stands out
   from techniques without use cases. The extra 2px is drawn outside the normal border, so the button keeps its size,
   and the red border of a selected group (below) stays visible inside it. */
button.has-use-cases {
  border-color: rgb(42, 42, 42);
  --outer-ring: 0 0 0 2px rgb(42, 42, 42);
}

/* A selected group: a red border with a thin red line inside it, 2px together. */
button.occurs-in-selected-groups {
  border-color: red;
  --inner-line: inset 0 0 0 0.5px red;
}

.buttontext {
  width: 125px;
  height: 24px;
  font-size: 10.5px;
  overflow: hidden;
  display: block;
  text-overflow: ellipsis;
  text-align: center;
}
</style>
