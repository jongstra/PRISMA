<script setup lang="ts">
// A button that says what a filter lets through, with a list of checkboxes below it when it is open (optionally with an
// "All" checkbox). A click outside closes it. Used by the platforms filter of the DeTT&CT page and the score filter of
// the MaGMa heatmap.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { vHint } from './hint';

export interface CheckboxItem {
  key: string;
  label: string;
  checked: boolean;
}

const props = defineProps<{ summary: string; items: CheckboxItem[]; allLabel?: string; hint?: string }>();
const emit = defineEmits<{ change: [key: string, checked: boolean]; changeAll: [checked: boolean] }>();

const open = ref(false);
const container = ref<HTMLElement | null>(null);
const allChecked = computed(() => props.items.every((item) => item.checked));
const someChecked = computed(() => !allChecked.value && props.items.some((item) => item.checked));

const checked = (event: Event) => (event.target as HTMLInputElement).checked;

function closeOnClickOutside(event: MouseEvent) {
  if (container.value && !container.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', closeOnClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', closeOnClickOutside));
</script>

<template>
  <div ref="container" class="checkbox-dropdown">
    <button type="button" class="header" :class="{ open }" :aria-expanded="open" v-hint="hint" @click="open = !open">
      <span class="summary">{{ summary }}</span>
      <span class="icon"></span>
    </button>
    <ul v-if="open" class="list">
      <li v-if="allLabel" class="all">
        <label>
          <input
            type="checkbox"
            :checked="allChecked"
            :indeterminate="someChecked"
            @change="emit('changeAll', checked($event))"
          />
          {{ allLabel }}
        </label>
      </li>
      <li v-for="item in items" :key="item.key">
        <label>
          <input type="checkbox" :checked="item.checked" @change="emit('change', item.key, checked($event))" />
          {{ item.label }}
        </label>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.checkbox-dropdown {
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: var(--border-control);
  border-radius: 5px;
  background-color: rgba(10, 10, 10, 0.35);
  color: white;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: 0.1s;
}

.header:hover {
  background-color: rgba(10, 10, 10, 0.25);
}

/* Weight on the span itself: main.css sets every element to normal weight. */
.summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.icon::after {
  content: '\02795'; /* plus */
  margin-left: 5px;
  font-size: 13px;
  color: white;
}

.header.open .icon::after {
  content: '\2796'; /* minus */
}

.list {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  background-color: var(--color-list);
  border: 1px solid #aaa;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.list li {
  padding: 5px;
}

.list li.all {
  border-bottom: 1px solid #aaa;
}

.list label {
  display: block;
  cursor: pointer;
}
</style>
