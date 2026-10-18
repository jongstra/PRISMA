<script setup lang="ts">
import { computed, ref } from 'vue';
import { tacticsStore, type Technique } from '@/stores/tactics';
import { hasDataComponents, isDetectable } from '@/domain/attack/visibility';
import { NOT_DETECTABLE_STYLE, NOT_DETECTABLE_TEXT } from '../common/notDetectableStyle';
import TechniqueTag from '../common/TechniqueTag.vue';
import { vHint } from '../common/hint';
import TechniqueTooltip from '../common/TechniqueTooltip.vue';
import { visibilityColour } from './visibilityColour';
import {
  ownVisibilityExplanation,
  ownVisibilityRatio,
  techniqueVisibilityExplanation,
  type ScoreOf,
} from './visibilityExplanation';
import { useTechniqueTooltip } from '../common/useTechniqueTooltip';

const store = tacticsStore();
const props = defineProps<{ technique: Technique }>();

// The matrix only shows technique buttons once the catalog is loaded, so the domain exists here.
const domain = store.currentDomain!;

const buttonRef = ref<HTMLElement | null>(null);
const { open: tooltipOpen, pinned, show: showTooltip, hide: hideTooltip, togglePin, unpin } = useTechniqueTooltip();

const hoverGroup = (groupName: string) => {
  domain.groups.forEach((group) => {
    if (group.name === groupName) {
      group.hovered = true;
    }
  });
};

const toggleGroupSelected = (groupName: string) => {
  domain.groups.forEach((group) => {
    if (group.name === groupName) {
      group.selected = !group.selected;
    }
  });
};

const hoverComponent = (componentName: string) => {
  domain.data_components.forEach((component) => {
    if (component.name === componentName) {
      component.hovered = true;
    }
  });
};

const toggleComponentSelected = (componentName: string) => {
  domain.data_components.forEach((component) => {
    if (component.name === componentName) {
      component.selected = !component.selected;
    }
  });
};

// A visibility percentage for the tooltip, in the colour of the matrix; 'n/a' (striped) when ATT&CK lists no data
// components for the (sub-)technique.
function visibilityChip(ratio: number, detectable: boolean) {
  if (!detectable) {
    return { text: 'n/a', style: NOT_DETECTABLE_STYLE };
  }
  return { text: `${(ratio * 100).toFixed(0)}%`, style: visibilityColour(ratio) };
}

// How each visibility percentage in the tooltip comes about, in the pink hint on its chip (once the tooltip is pinned):
// from the device completeness (0-5) of the data components in use, as loaded from the DeTT&CT file.
const scoreOf: ScoreOf = (name) => {
  const component = domain.data_components.find((c) => c.name === name);
  return component?.visibility ? (component.quality.device_completeness ?? 0) : null;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const isGroupSelected = (name: string) => !!domain.groups.find((group) => group.name === name)?.selected;
const isComponentSelected = (name: string) => !!domain.data_components.find((c) => c.name === name)?.selected;
const isComponentInUse = (name: string) => !!domain.data_components.find((c) => c.name === name)?.visibility;

function getButtonStyles(visibility_ratio: number, detectable = true) {
  return detectable ? visibilityColour(visibility_ratio) : NOT_DETECTABLE_STYLE;
}

const showButton = computed(() => {
  const platforms = props.technique?.platforms || [];

  const platformFilterResult = platforms.some((platform) => store.activeAttributes('platforms').includes(platform));

  const searchQueryFilterResult =
    !store.searchQuery || // There is no search query.
    props.technique.name.toLowerCase().includes(store.searchQuery.toLowerCase()) || // The search query matches on the technique name.
    props.technique.external_id.toLowerCase().includes(store.searchQuery.toLowerCase()); // The search query matches on the technique ID.

  const techniqueVisibilityPercentageFilterResult =
    props.technique.visibility_ratio >= store.minVisibilityRatio &&
    props.technique.visibility_ratio <= store.maxVisibilityRatio;

  // Filter techniques based on the Minimum Total Occurrence BINNED slider.
  let techniqueTotalOccurrencesFilterBinnedResult = false;
  // Minimum Total Occurrence: Low
  if (store.minTotalOccurrencesBinned <= 0) {
    techniqueTotalOccurrencesFilterBinnedResult = true;
  }
  // Minimum Total Occurrence: Medium
  if (store.minTotalOccurrencesBinned === 1) {
    techniqueTotalOccurrencesFilterBinnedResult = props.technique.occurrence_total_order_normalized > 0.25;
  }
  // Minimum Total Occurrence: High
  if (store.minTotalOccurrencesBinned === 2) {
    techniqueTotalOccurrencesFilterBinnedResult = props.technique.occurrence_total_order_normalized > 0.5;
  }
  // Minimum Total Occurrence: Very High
  if (store.minTotalOccurrencesBinned >= 3) {
    techniqueTotalOccurrencesFilterBinnedResult = props.technique.occurrence_total_order_normalized > 0.75;
  }

  // When the group tool mask toggle (domain.only_show_selected_groups) is switch to 'true', we want to hide all techniques that are not covered by the selected groups.
  const groupMaskFilterResult = !(
    domain.only_show_selected_groups && !store.selectedGroupsTechniquesSet.has(props.technique.name)
  );

  // When the component tool mask toggle (domain.only_show_selected_components) is switch to 'true', we want to hide all techniques that are not covered by the selected components.
  const componentMaskFilterResult = !(
    domain.only_show_selected_components && !store.selectedComponentsTechniquesSet.has(props.technique.name)
  );

  return (
    platformFilterResult &&
    searchQueryFilterResult &&
    techniqueVisibilityPercentageFilterResult &&
    techniqueTotalOccurrencesFilterBinnedResult &&
    groupMaskFilterResult &&
    componentMaskFilterResult
  );
});

const occursInHoveredGroups = () => {
  if (store.hoveredGroupsTechniquesSet.has(props.technique.name)) {
    return true;
  } else {
    return false;
  }
};

const occursInSelectedGroups = () => {
  if (store.selectedGroupsTechniquesSet.has(props.technique.name)) {
    return true;
  } else {
    return false;
  }
};

const occursInHoveredComponents = () => {
  if (store.hoveredComponentsTechniquesSet.has(props.technique.name)) {
    return true;
  } else {
    return false;
  }
};

const occursInSelectedComponents = () => {
  if (store.selectedComponentsTechniquesSet.has(props.technique.name)) {
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
    :style="getButtonStyles(technique.visibility_ratio, isDetectable(technique))"
    @click="togglePin"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    :class="{
      pinned,
      'occurs-in-hovered-groups': occursInHoveredGroups(),
      'occurs-in-selected-groups': occursInSelectedGroups(),
      'occurs-in-hovered-components': occursInHoveredComponents(),
      'occurs-in-selected-components': occursInSelectedComponents(),
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
      <div class="tt-row">
        <span class="tt-strong">Visibility</span>
        <span
          class="tt-chip"
          v-hint="isDetectable(technique) ? techniqueVisibilityExplanation(technique, scoreOf) : NOT_DETECTABLE_TEXT"
          :style="visibilityChip(technique.visibility_ratio, isDetectable(technique)).style"
          >{{ visibilityChip(technique.visibility_ratio, isDetectable(technique)).text }}</span
        >
      </div>
      <div v-if="!isDetectable(technique)" class="tt-note">{{ NOT_DETECTABLE_TEXT }}</div>
    </div>

    <div class="tt-section">
      <!-- With sub-techniques: the parts of the visibility above, the technique's own value first. -->
      <div class="tt-label">
        <template v-if="technique.sub_techniques?.length"
          >The technique and its
          {{ plural(technique.sub_techniques.length, 'sub-technique', 'sub-techniques') }}</template
        >
        <template v-else>Sub-techniques</template>
      </div>
      <div v-if="technique.sub_techniques?.length" class="tt-row">
        <span class="tt-itself">The technique itself</span>
        <span
          class="tt-chip"
          v-hint="
            hasDataComponents(technique)
              ? ownVisibilityExplanation(technique, scoreOf)
              : 'n/a: ATT&CK lists no data components for the technique itself, so it is left out of the average.'
          "
          :style="visibilityChip(ownVisibilityRatio(technique, scoreOf), hasDataComponents(technique)).style"
          >{{ visibilityChip(ownVisibilityRatio(technique, scoreOf), hasDataComponents(technique)).text }}</span
        >
      </div>
      <div v-for="sub in technique.sub_techniques" :key="sub.external_id" class="tt-row">
        <a
          :href="`https://attack.mitre.org/techniques/${sub.external_id.replace('.', '/')}/`"
          target="_blank"
          rel="noopener"
          >{{ sub.name }}</a
        >
        <span
          class="tt-chip"
          v-hint="hasDataComponents(sub) ? ownVisibilityExplanation(sub, scoreOf) : NOT_DETECTABLE_TEXT"
          :style="visibilityChip(sub.visibility_ratio ?? 0, hasDataComponents(sub)).style"
          >{{ visibilityChip(sub.visibility_ratio ?? 0, hasDataComponents(sub)).text }}</span
        >
      </div>
      <span v-if="!technique.sub_techniques?.length" class="tt-none">None</span>
    </div>

    <!-- The data components first: they explain the visibility. Hovering one highlights its techniques; a click selects it. -->
    <div class="tt-section">
      <div class="tt-label">Data components ({{ technique.data_components.length }})</div>
      <div v-if="technique.data_components.length" class="tt-tags">
        <TechniqueTag
          v-for="component in technique.data_components"
          :key="component"
          :name="component"
          kind="component"
          :selected="isComponentSelected(component)"
          :in-use="isComponentInUse(component)"
          @mouseover="hoverComponent(component)"
          @click="toggleComponentSelected(component)"
        />
      </div>
      <span v-else class="tt-none">None</span>
    </div>

    <div class="tt-section">
      <div class="tt-label">Used by</div>
      {{ plural(technique.occurrence_groups, 'group', 'groups') }} · {{ technique.occurrence_software }} software ·
      {{ technique.occurrence_total }} in total
    </div>

    <!-- Hovering a group highlights its techniques; a click selects it. -->
    <div class="tt-section">
      <div class="tt-label">Groups ({{ technique.groups.length }})</div>
      <div v-if="technique.groups.length" class="tt-tags">
        <TechniqueTag
          v-for="group in technique.groups"
          :key="group"
          :name="group"
          kind="group"
          :selected="isGroupSelected(group)"
          @mouseover="hoverGroup(group)"
          @click="toggleGroupSelected(group)"
        />
      </div>
      <span v-else class="tt-none">None</span>
    </div>
  </TechniqueTooltip>
</template>

<style scoped>
/* A button can have an inner red line (selected group) and an outer ring (hover, or a group or data component hovered
   in the tooltip) at the same time: each is a variable, and box-shadow shows both. */
button {
  --inner-line: 0 0 transparent;
  --outer-ring: 0 0 transparent;
  margin-top: 0px;
  margin-bottom: 3px;
  background-color: var(--color-technique);
  border: 1.5px solid var(--color-control-border);
  border-radius: 4px; /* Slightly rounded corners */
  box-shadow: var(--inner-line), var(--outer-ring);
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease; /* Smooth transition for hover effects */
  position: relative; /* Ensure the button's stacking context is isolated */
}

/* By adding button.occurs-in-hovered-groups.pinned, button.occurs-in-hovered-components.pinned here,
we override the box-shadow that is normally shown when hovering a group/component in the tooltip. */
button:hover,
button.pinned,
button.occurs-in-hovered-groups.pinned,
button.occurs-in-hovered-components.pinned {
  transform: translate(0px, -2px) scale(1.04); /* On hover, move the button slightly to the right and upwards, and enlarge it slightly. */
  --outer-ring:
    rgba(0, 0, 0, 0.16) 0px 1px 3px, rgb(51, 51, 51) 0px 0px 0px 2.5px; /* On hover, a dark ring around the button. */
  filter: brightness(0.88); /* Slightly darken the button on hover */
  z-index: 1001;
}

button.occurs-in-hovered-groups,
button.occurs-in-hovered-components {
  --outer-ring: 0px 0px 3px 3px rgba(255, 174, 0, 1);
}

/* A selected group: a red border with a thin red line inside it, 2px together. */
button.occurs-in-selected-groups {
  border-color: red;
  --inner-line: inset 0 0 0 0.5px red;
}

button.occurs-in-selected-components {
  outline: 2px solid #03c03cd2; /* A selected data component: a green line just inside the border. */
  outline-offset: -4px;
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
