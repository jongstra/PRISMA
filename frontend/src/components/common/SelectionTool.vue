<script setup lang="ts">
// Selects groups or data components of the current domain, to highlight (or only show) the techniques they use or
// cover. Used on the DeTT&CT page (groups and data components) and on the MaGMa heatmap (groups). In the look of a
// control box: while nothing is selected, a label and a search field like the technique search; once something is
// selected, the search field moves up next to the label, thinner, with the switch (only show these) and a clear icon,
// and the selected items take its place below: two rows, then a thin scroll bar, so the box keeps its height.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { notifyUndoable } from './notify';
import { thumbGeometry, type ThumbGeometry } from './scrollbarGeometry';
import { vHint } from './hint';
import { suggestedItems } from './selectionSearch';
import { tacticsStore, type TechniqueAttribute } from '@/stores/tactics';

const props = defineProps<{
  label: string; // 'Groups' or 'Components'
  list: 'groups' | 'data_components'; // the list of the domain to select from
  selectedField: 'selected' | 'selectedInMagmaHeatmap'; // the field that marks an item as selected
  // The domain field that says: only show the techniques of the selected items.
  onlyShowField:
    'only_show_selected_groups' | 'only_show_selected_components' | 'only_show_selected_groups_magma_heatmap';
  noun: string; // 'group' or 'component', for the texts
  toggleTitle: string;
  color: 'red' | 'green'; // colour of the selected items
}>();

const store = tacticsStore();

const items = computed<TechniqueAttribute[]>(() => store.currentDomain?.[props.list] ?? []);

const selectedItems = computed(() => items.value.filter((item) => item[props.selectedField] === true));

const removeSelection = (item: TechniqueAttribute) => {
  delete item[props.selectedField];
};

// Clear all selections at once; the message offers to undo it.
const clearAllSelections = () => {
  const cleared = selectedItems.value.slice();
  cleared.forEach((item) => delete item[props.selectedField]);
  const count = cleared.length;
  notifyUndoable(`Cleared ${count} ${props.noun}${count === 1 ? '' : 's'}.`, undefined, () =>
    cleared.forEach((item) => (item[props.selectedField] = true)),
  );
};

// Search field: clicking it opens a list of the items that are not selected yet, which narrows while typing (see
// selectionSearch.ts). Choosing an item keeps the list open, to choose more; Esc or clicking elsewhere closes it.
// Enter selects the item with exactly the typed name.
const searchQuery = ref('');
const listOpen = ref(false);
const suggestions = computed(() =>
  suggestedItems(items.value, searchQuery.value, (item) => item[props.selectedField] === true),
);

const selectItem = (item: TechniqueAttribute) => {
  item[props.selectedField] = true;
  searchQuery.value = '';
};

const addItemFromSearch = () => {
  const existingItem = items.value.find((item) => item.name.toLowerCase() === searchQuery.value.toLowerCase());
  if (existingItem) {
    selectItem(existingItem);
  }
};

// The scroll bar of the selected items: drawn, so it also shows where the system only shows one while scrolling (macOS).
const itemList = ref<HTMLElement | null>(null);
const thumb = ref<ThumbGeometry>({ visible: false, top: 0, height: 0 });
const updateThumb = () => {
  const list = itemList.value;
  thumb.value = list
    ? thumbGeometry(list.clientHeight, list.scrollHeight, list.scrollTop, 8)
    : { visible: false, top: 0, height: 0 };
};
watch(
  () => selectedItems.value.length,
  () => nextTick(updateThumb),
);
onMounted(() => {
  window.addEventListener('resize', updateThumb);
  updateThumb();
});
onUnmounted(() => window.removeEventListener('resize', updateThumb));

const onlyShowSelected = computed<boolean>({
  get: () => store.currentDomain?.[props.onlyShowField] ?? false,
  set: (value) => {
    if (store.currentDomain) {
      store.currentDomain[props.onlyShowField] = value;
    }
  },
});
</script>

<template>
  <div class="selection-container" :class="[`items-${color}`, { 'has-selection': selectedItems.length > 0 }]">
    <div class="top">
      <span class="control-label">{{ label }}</span>
      <input
        class="search-box search-field"
        :class="{ compact: selectedItems.length > 0 }"
        v-model="searchQuery"
        :placeholder="selectedItems.length ? 'Search...' : `Search ${noun}s...`"
        @focus="listOpen = true"
        @input="listOpen = true"
        @blur="listOpen = false"
        @keydown.enter="addItemFromSearch"
        @keydown.escape="listOpen = false"
      />
      <template v-if="selectedItems.length">
        <label class="toggle-label" v-hint="toggleTitle">
          <input type="checkbox" v-model="onlyShowSelected" />
          <span class="toggle-switch"></span>
        </label>
        <button
          type="button"
          class="clear-icon"
          :aria-label="`Clear all ${noun}s`"
          v-hint="`Clear all ${noun}s`"
          @click="clearAllSelections"
        >
          &#x2715;
        </button>
      </template>
    </div>
    <!-- mousedown.prevent: choosing an item keeps the focus (and the list) in the search field. -->
    <div v-if="listOpen && suggestions.length" class="suggestions" @mousedown.prevent>
      <div v-for="item in suggestions" :key="item.name" class="suggestion-item" @click="selectItem(item)">
        {{ item.name }}
      </div>
    </div>
    <Transition name="items" @after-enter="updateThumb">
      <div v-if="selectedItems.length" class="items">
        <div ref="itemList" class="buttons-wrapper" @scroll="updateThumb">
          <button v-for="item in selectedItems" :key="item.name" @click="removeSelection(item)">
            {{ item.name }}
          </button>
        </div>
        <div
          v-if="thumb.visible"
          class="items-thumb"
          :style="{ top: `${thumb.top}px`, height: `${thumb.height}px` }"
          aria-hidden="true"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.selection-container {
  --item-color: rgb(255, 104, 104);
  --item-hover-color: rgb(225, 52, 52);
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 3px 6px 4px; /* as a control box (ControlBox.vue) */
  font-size: 14px;
  border: var(--border-box);
  border-radius: var(--radius-box);
  background-color: var(--color-box);
  position: relative; /* the list of suggestions is placed in it */
}

.selection-container.items-green {
  --item-color: rgb(110, 220, 110);
  --item-hover-color: rgb(55, 190, 55);
}

/* Nothing selected: the label above the search field, which is centred in the rest of the box, as in a control box.
   Something selected: the label, a thinner search field, the switch and the clear icon on one line, with two rows of
   items below; the box is 64px (ControlPanel.vue) either way. */
.top {
  display: grid;
  flex: 1;
  grid-template-rows: auto 1fr;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 3px;
}

.has-selection {
  gap: 2px;
  padding-bottom: 3px;
}

.has-selection .top {
  flex: none;
  grid-template-rows: auto;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 6px;
}

.search-box.compact {
  height: 20px;
  padding: 0 7px;
  font-size: 12px;
  border-radius: 4px;
}

/* The label of a control box (ControlBox.vue). */
.control-label {
  font-size: 11px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
}

.search-box {
  min-width: 0; /* the search field shrinks in a narrower box, so the switch and the clear icon stay inside it */
}

button {
  display: inline-flex;
  align-items: center;
  padding: 0px 3px;
  background-color: var(--item-color);
  border-width: 1.5px;
  border-style: solid;
  border-color: var(--color-control-border);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
  font-size: 11px;
  height: 16px;
  line-height: 1;
}

button:hover {
  background-color: var(--item-hover-color);
}

/* The × of a selected item, after its name and in the middle of its height. It is drawn (a mask over the white
   background), so it sits in the middle in every font; the whole item removes it. */
.buttons-wrapper button::after {
  content: '';
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-left: 4px;
  background-color: #ffffff;
  mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><path d='M1.5 1.5l7 7M8.5 1.5l-7 7' stroke='black' stroke-width='1.6' stroke-linecap='round'/></svg>")
    center / contain no-repeat;
}

/* Clear all: a small square button, as high as the thinner search field, in the quiet style of the other controls. */
.clear-icon {
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;
  color: var(--color-text-muted);
  background-color: white;
  border: var(--border-control);
  border-radius: 4px;
}

.clear-icon:hover {
  color: var(--color-remove);
  background-color: white;
  border-color: var(--color-remove);
}

.suggestions {
  position: absolute; /* below the search field, over what follows */
  top: 100%;
  left: 6px;
  right: 6px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: -2px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10; /* Ensure it appears above other elements */
}

.suggestion-item {
  padding: 5px 10px;
  cursor: pointer;
}

.suggestion-item:hover {
  background-color: #f0f0f0;
}

/* The selected items, below the search field: two rows of 16px items, then they scroll. The system's scroll bar is
   hidden; a thin one is drawn at the right (items-thumb), so it also shows on a Mac, where the system shows one only
   while scrolling. */
.items {
  position: relative;
  max-height: 34px;
}

.buttons-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 2px;
  max-height: 34px;
  padding-right: 6px; /* room for the scroll bar */
  overflow-y: auto;
  scrollbar-width: none;
}

.buttons-wrapper::-webkit-scrollbar {
  display: none;
}

.items-thumb {
  position: absolute;
  right: 0;
  width: 3px;
  border-radius: 1.5px;
  background-color: #888;
  pointer-events: none;
}

/* The selected items fade in when they appear. When they are cleared they go at once: the search field moves back below
   the label at the same moment, so a fade-out would make the box taller for a moment. */
.items-enter-active {
  transition:
    max-height 0.15s ease,
    opacity 0.15s ease;
  overflow: hidden;
}

.items-enter-from {
  max-height: 0;
  opacity: 0;
}

.items-leave-active {
  display: none;
}

/* Toggle switch styles */
.toggle-label {
  position: relative;
  display: block;
  cursor: pointer;
  width: 36px;
  height: 20px;
}

.toggle-switch {
  position: absolute;
  top: 0;
  left: 0;
  width: 36px;
  height: 20px;
  background-color: var(--color-switch-off);
  border-radius: 34px;
  transition: 0.4s;
}

.toggle-switch:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.toggle-label input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label input:checked + .toggle-switch {
  background-color: var(--color-switch-on);
}

.toggle-label input:checked + .toggle-switch:before {
  transform: translateX(16px);
}
</style>
