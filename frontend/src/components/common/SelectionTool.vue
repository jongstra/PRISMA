<script setup lang="ts">
// Selects groups or data components of the current domain, to highlight (or only show) the techniques they use or
// cover. Used on the DeTT&CT page (groups and data components) and on the MaGMa heatmap (groups).
import Swal from 'sweetalert2';
import { computed, ref } from 'vue';
import { vHint } from './hint';
import { tacticsStore, type TechniqueAttribute } from '@/stores/tactics';

const props = defineProps<{
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

const clearAllSelections = () => {
  items.value.forEach((item) => delete item[props.selectedField]);
};

// Clear all selections, after confirmation.
const confirmClearAllSelections = () => {
  if (selectedItems.value.length === 0) {
    return;
  }

  Swal.fire({
    title: `Clear all ${props.noun} selections?`,
    text: "You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: 'green',
    confirmButtonText: `Yes, clear all ${props.noun} selections`,
    cancelButtonText: 'No, cancel',
    reverseButtons: true,
    customClass: {
      confirmButton: 'swal2-confirm-custom',
      cancelButton: 'swal2-cancel-custom',
    },
  }).then((result) => {
    if (result.isConfirmed) {
      clearAllSelections();
    }
  });
};

// Search field: suggestions while typing; Enter selects an item with exactly that name.
const searchQuery = ref('');
const filteredItems = computed(() => {
  if (!searchQuery.value) return [];
  return items.value.filter((item) => item.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

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
  <div class="selection-container" :class="`items-${color}`">
    <div class="header">
      <input
        class="search-box"
        v-model="searchQuery"
        :placeholder="`Search ${noun}s...`"
        @keydown.enter="addItemFromSearch"
      />
      <button class="clear-all-button" @click="confirmClearAllSelections">Clear</button>
      <label class="toggle-label" v-hint="toggleTitle">
        <input type="checkbox" v-model="onlyShowSelected" />
        <span class="toggle-switch"></span>
      </label>
    </div>
    <div v-if="filteredItems.length && searchQuery" class="suggestions">
      <div v-for="item in filteredItems" :key="item.name" class="suggestion-item" @click="selectItem(item)">
        {{ item.name }}
      </div>
    </div>
    <div v-if="selectedItems.length" class="buttons-wrapper">
      <button v-for="item in selectedItems" :key="item.name" @click="removeSelection(item)">
        {{ item.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.selection-container {
  --item-color: rgb(255, 104, 104);
  --item-hover-color: rgb(225, 52, 52);
  padding: 2px;
  font-size: 14px;
  border: 2px solid #555;
  border-radius: 5px;
  background-color: #ddd;
  width: 265px;
  position: relative; /* Ensure absolute positioning is relative to this container */
}

.selection-container.items-green {
  --item-color: rgb(110, 220, 110);
  --item-hover-color: rgb(55, 190, 55);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
}

input {
  flex: 1;
  margin: 0px 5px;
  padding: 2px 8px;
  border: 1.5px solid #333;
  border-radius: 4px;
  height: 26px;
  font-size: 13.3px;
  min-width: 0; /* the search field shrinks in a narrower box, so Clear and the switch stay inside it */
}

button {
  display: inline-block;
  padding: 0px 3px;
  background-color: var(--item-color);
  border-width: 1.5px;
  border-style: solid;
  border-color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
  font-size: 11px;
  height: 18px;
}

button:hover {
  background-color: var(--item-hover-color);
}

button::before {
  content: '\2715'; /* Unicode for 'X' */
  margin-right: 4px;
  font-size: 12px;
  color: #ffffff;
}

.clear-all-button {
  height: 26px; /* as high as the search field */
  background-color: pink;
}

.clear-all-button::before {
  content: '';
  margin-right: 0px;
}

.clear-all-button:hover {
  background-color: hotpink;
}

.suggestions {
  position: absolute; /* Position absolutely within the selection-container */
  left: 5px;
  right: 5px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 5px;
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

/* The selected items, below the search field and starting where it starts. The box grows with them up to two lines;
   more lines scroll, with a thin scroll bar (the same as the text fields of the MaGMa sheets). */
.buttons-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 2px;
  max-height: 38px; /* two lines of 18px items */
  margin: 4px 5px 2px;
  overflow-y: auto;
}

.buttons-wrapper::-webkit-scrollbar {
  width: 3px;
}

.buttons-wrapper::-webkit-scrollbar-thumb {
  border-radius: 1.5px;
  background-color: #888;
}

.buttons-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

@supports not selector(::-webkit-scrollbar) {
  .buttons-wrapper {
    scrollbar-width: thin;
    scrollbar-color: #888 transparent;
  }
}

/* Toggle switch styles */
.toggle-label {
  position: relative;
  display: inline-block;
  cursor: pointer;
  width: 40px;
}

.toggle-switch {
  position: absolute;
  top: -1px; /* Adjusted for vertical alignment */
  left: 3px;
  width: 36px;
  height: 20px;
  background-color: #ccc;
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
  background-color: #2196f3;
}

.toggle-label input:checked + .toggle-switch:before {
  transform: translateX(16px);
}
</style>
