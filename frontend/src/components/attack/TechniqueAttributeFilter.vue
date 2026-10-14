<script setup lang="ts">
// The platforms filter of the DeTT&CT page: which platforms' techniques the matrix shows. The button says what it lets
// through, such as 'All platforms' or '10 of 11 platforms' (see CheckboxDropdown.vue).
import { computed } from 'vue';
import CheckboxDropdown from '@/components/common/CheckboxDropdown.vue';
import { tacticsStore, type Attribute, type Domain } from '@/stores/tactics';
import { filterSummary } from './controlValues';

const props = defineProps({
  attribute_type: {
    type: String,
    required: true,
  },
});

const store = tacticsStore();

const attributes = computed(
  () => (store.currentDomain?.[props.attribute_type as keyof Domain] as Attribute[] | undefined) ?? [],
);
const items = computed(() =>
  attributes.value.map((attribute) => ({
    key: attribute.name,
    label: attribute.name,
    checked: !!attribute.active_in_filter,
  })),
);
const summary = computed(() =>
  filterSummary(items.value.filter((item) => item.checked).length, items.value.length, props.attribute_type),
);

function change(name: string, checked: boolean) {
  const attribute = attributes.value.find((candidate) => candidate.name === name);
  if (attribute) {
    attribute.active_in_filter = checked;
  }
}

function changeAll(checked: boolean) {
  attributes.value.forEach((attribute) => {
    attribute.active_in_filter = checked;
  });
}
</script>

<template>
  <CheckboxDropdown :summary="summary" :items="items" all-label="All" @change="change" @change-all="changeAll" />
</template>
