<script setup lang="ts">
// A search field in the L2 and L3 sheets, for the parent use case and the ATT&CK technique: it shows the chosen option
// with its ID in bold. Clicking it, or typing on it, opens a search field with a list of the options, filtered while
// typing (see optionSearch.ts). A click or Enter chooses an option, Esc or leaving the field keeps the current one, and
// × removes it ('none'). The list is shown in the page body, so the scrolling table does not cut it off (see
// listPlacement.ts).
import { computed, nextTick, onUnmounted, ref, useId } from 'vue';
import { searchOptions, type Option } from './optionSearch';
import { listPlacement } from './listPlacement';
import { vHint } from '@/components/common/hint';

const props = withDefaults(
  defineProps<{
    modelValue?: string; // the chosen ID, or 'none'
    options: Option[];
    search?: (options: Option[], query: string) => Option[];
    noun?: string; // what an option is, for the texts: 'technique' or 'use case'
  }>(),
  { modelValue: undefined, search: searchOptions, noun: 'option' },
);
const emit = defineEmits<{ 'update:modelValue': [id: string] }>();

const listId = useId();
const field = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref('');
const active = ref(0); // the highlighted option
const position = ref({ left: 0, top: 0, width: 0, maxHeight: 0 });

const hasValue = computed(() => !!props.modelValue && props.modelValue !== 'none');
const current = computed(() => props.options.find((option) => option.id === props.modelValue));
const matches = computed(() => props.search(props.options, query.value));

function place() {
  if (!field.value || !list.value) {
    return;
  }
  const window = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
  position.value = listPlacement(field.value.getBoundingClientRect(), list.value.scrollHeight, window);
}

// Keeps the highlighted option in view while it moves with the arrow keys.
function showActive() {
  const option = list.value?.querySelector<HTMLElement>(`#${CSS.escape(`${listId}-${active.value}`)}`);
  option?.scrollIntoView?.({ block: 'nearest' });
}

async function openList(text = '') {
  query.value = text;
  open.value = true;
  active.value = text
    ? 0
    : Math.max(
        0,
        matches.value.findIndex((option) => option.id === props.modelValue),
      );
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place);
  await nextTick();
  input.value?.focus();
  place();
  showActive();
}

function close() {
  open.value = false;
  window.removeEventListener('scroll', place, { capture: true });
  window.removeEventListener('resize', place);
}

function choose(id: string) {
  close();
  emit('update:modelValue', id);
}

async function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  active.value = 0;
  await nextTick();
  place();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    active.value = Math.min(Math.max(active.value + step, 0), matches.value.length - 1);
    showActive();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const option = matches.value[active.value];
    if (option) {
      choose(option.id);
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}

// On the closed field, the arrow keys open the list, and typing a letter or digit starts a search with it.
function onFieldKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    openList();
  } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    openList(event.key);
  }
}

onUnmounted(close);
</script>

<template>
  <div ref="field" class="option-picker">
    <template v-if="open">
      <input
        ref="input"
        :value="query"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="true"
        :aria-controls="listId"
        :aria-activedescendant="matches.length > 0 ? `${listId}-${active}` : undefined"
        :placeholder="current ? current.id : 'Search by ID or name'"
        @input="onInput"
        @keydown="onKeydown"
        @blur="close"
      />
      <Teleport to="body">
        <ul
          :id="listId"
          ref="list"
          role="listbox"
          class="options"
          :style="{
            left: `${position.left}px`,
            top: `${position.top}px`,
            width: `${position.width}px`,
            maxHeight: `${position.maxHeight}px`,
          }"
          @mousedown.prevent
        >
          <li
            v-for="(option, index) in matches"
            :id="`${listId}-${index}`"
            :key="option.id"
            role="option"
            :aria-selected="index === active"
            :class="{ active: index === active, chosen: option.id === modelValue }"
            @mousedown="choose(option.id)"
            @mousemove="active = index"
          >
            <span class="option-id">{{ option.id }}</span> {{ option.name }}
          </li>
          <li v-if="options.length === 0" class="no-match">No {{ noun }}s to choose from</li>
          <li v-else-if="matches.length === 0" class="no-match">No {{ noun }} matches "{{ query }}"</li>
        </ul>
      </Teleport>
    </template>
    <template v-else>
      <button
        type="button"
        class="current"
        v-hint="current ? `${current.id} ${current.name}` : undefined"
        @click="openList()"
        @keydown="onFieldKeydown"
      >
        <template v-if="current"
          ><span class="option-id">{{ current.id }}</span> {{ current.name }}</template
        >
        <template v-else-if="hasValue">{{ modelValue }}</template>
        <template v-else>None</template>
      </button>
      <button v-if="hasValue" type="button" class="clear" v-hint="`No ${noun}`" @click="choose('none')">×</button>
    </template>
  </div>
</template>

<style scoped>
.option-picker {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100%; /* fills the cell, like the other fields of the sheet */
  min-height: var(--sheet-row-height, 59px); /* the row height of the sheet (UseCaseTable.vue) */
  background-color: white; /* the sheet can give another colour, e.g. red for a parent that does not exist */
}

.current,
input {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  border: 0;
  background: none;
  font: inherit;
  /* The text of the sheet (UseCaseTable.vue): three lines fit in a row, like the text fields. */
  font-size: 13px;
  line-height: 16px;
}

input {
  background: white;
}

.current {
  white-space: normal;
  overflow-wrap: break-word;
  cursor: pointer;
}

.clear {
  border: 0;
  background: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}

.clear:hover {
  color: #e73030;
}

.option-id {
  font-weight: bold;
}

.options {
  position: fixed;
  z-index: 1000;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  background: white;
  border: 1px solid #888;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-family: Inter, sans-serif; /* shown in the page body, outside #app */
  font-size: 13px;
  text-align: left;
}

.options li {
  padding: 5px 8px;
  cursor: pointer;
}

.options li.active {
  background-color: rgb(196, 213, 234);
}

.options li.chosen {
  font-style: italic;
}

.options li.no-match {
  color: #888;
  cursor: default;
}
</style>
