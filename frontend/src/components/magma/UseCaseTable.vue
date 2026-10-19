<script setup lang="ts">
// The L1, L2 or L3 sheet of the MaGMa page (the active tab): one row per use case of the current domain, with a button
// to add a use case. The columns are defined in useCaseColumns.ts.
import Swal from 'sweetalert2';
import { computed, ref } from 'vue';
import { magmaStore, type UseCase } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';
import { USE_CASE_COLUMNS, type SheetLevel } from './useCaseColumns';
import OptionPicker from './OptionPicker.vue';
import { searchTechniques } from './optionSearch';
import { vHint } from '@/components/common/hint';
import { NOT_DETECTABLE_STYLE } from '@/components/common/notDetectableStyle';
import { nextSort, sortedRows, type SortValue } from './useCaseSort';
import { typedPercentage } from './percentageInput';

const magma = magmaStore();
const tactics = tacticsStore();

const columns = computed(() => USE_CASE_COLUMNS[magma.activeTab as SheetLevel]);

// Each sheet is as wide as its columns (the delete column, the columns of useCaseColumns.ts, and the 2px between the cells
// and at both ends), so the columns the sheets share are equally wide on each sheet, whatever the width of the window.
const DELETE_COLUMN_WIDTH = 28;
const sheetWidth = computed(
  () =>
    DELETE_COLUMN_WIDTH + columns.value.reduce((sum, column) => sum + column.width, 0) + (columns.value.length + 2) * 2,
);
const useCases = computed(() => magma.activeTabUseCases(tactics.domain));

// Sorting by a column (a click on its header): only the order on the screen changes, not the order of the use cases or
// the file. IN and THR stay on top of L1. A row stays in its place while it is being edited (it is sorted by the value it
// had when the editing started), so it does not jump away while typing; it moves when it is left.
const sort = computed(() => magma.sheetSorts[magma.activeTab] ?? null);
const toggleSort = (field: string) => {
  magma.sheetSorts[magma.activeTab] = nextSort(sort.value, field);
};
const ariaSort = (field: string) => (sort.value?.field === field ? sort.value.direction : 'none');

function sortValue(useCase: UseCase, field: string): SortValue {
  if (field === 'L1nrChildren' || field === 'L2nrChildren') return magma.getChildUseCases(useCase).length;
  if (field === 'L1nrGrandChildren') return magma.getGrandChildUseCases(useCase).length;
  if (field === 'parentIds') return (useCase.parentIds ?? []).join(', ');
  if (field === 'attackTechniqueId') return useCase.attackTechniqueId === 'none' ? '' : useCase.attackTechniqueId;
  return fieldValue(useCase, field) as SortValue;
}

const editing = ref<{ uid: string; value: SortValue } | null>(null);
const startEditing = (useCase: UseCase) => {
  if (editing.value?.uid !== useCase.uid) {
    editing.value = { uid: useCase.uid, value: sort.value ? sortValue(useCase, sort.value.field) : null };
  }
};
const stopEditing = (event: FocusEvent) => {
  const row = event.currentTarget as HTMLElement;
  if (!(event.relatedTarget instanceof Node && row.contains(event.relatedTarget))) {
    editing.value = null;
  }
};

const rows = computed(() =>
  sortedRows(
    useCases.value,
    sort.value,
    (useCase) => (editing.value?.uid === useCase.uid ? editing.value.value : sortValue(useCase, sort.value!.field)),
    (useCase) => !!useCase.permanent,
  ),
);

// The value of the use case field that a column shows.
const fieldValue = (useCase: UseCase, field: string) => useCase[field as keyof UseCase];

// The text of a text field (name, description or data source); a number from a file is shown as text.
const textValue = (useCase: UseCase, field: string) => String(fieldValue(useCase, field) ?? '');

// The percentages that are typed in a number field, and the calculated ones that are only shown.
const PERCENTAGE_INPUTS = ['visibility', 'implementation', 'effectiveness', 'inImpact', 'thrImpact', 'outImpact'];
const PERCENTAGES_SHOWN = ['visibility', 'implementation', 'effectiveness', 'weight', 'potential'];
const TEXT_FIELDS = ['id', 'name', 'description', 'dataSource'];
// The text fields of one line: Enter ends editing (as in a spreadsheet), and pasted line breaks become spaces. The
// description can have several lines.
const SINGLE_LINE_FIELDS = ['id', 'name', 'dataSource'];

// The averages in the row below the L1 sheet.
const averages = computed(() => {
  const data = useCases.value;
  if (data.length === 0) {
    return {};
  }
  const average = (field: string) =>
    (data.reduce((sum, useCase) => sum + (Number(fieldValue(useCase, field)) || 0), 0) / data.length).toFixed(2);
  return {
    visibility: average('visibility'),
    implementation: average('implementation'),
    effectiveness: average('effectiveness'),
    weight: average('weight'),
    potential: average('potential'),
  };
});

const addNewUseCase = () => {
  const level = parseFloat(magma.activeTab.slice(-1));
  magma.addNewUseCase(level, tactics.domain);
};

// A short list of use case IDs for a message, e.g. "DOS-1-1, DOS-1-2 and 3 more".
const listIds = (useCases: UseCase[], max = 5) => {
  const ids = useCases
    .slice(0, max)
    .map((useCase) => useCase.id)
    .join(', ');
  return useCases.length > max ? `${ids} and ${useCases.length - max} more` : ids;
};

// Child use cases are kept when their parent is deleted, but lose their parent, so the dialog warns about them.
const confirmRemoveUseCase = (useCase: UseCase) => {
  const children = magma.getChildUseCases(useCase);
  const childrenWarning =
    children.length === 0
      ? ''
      : `"${useCase.id}" still has ${children.length} child use case(s): ${listIds(children)}. They will lose their parent (and turn red), so you can move them to another parent.\n\n`;
  Swal.fire({
    titleText: `Delete use case '${useCase.id}'?`,
    text: childrenWarning + "You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: 'green',
    confirmButtonText: 'Yes, delete this use case',
    cancelButtonText: 'No, cancel',
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      magma.removeUseCaseByUid(useCase.uid);
    }
  });
};

const confirmRemoveUseCaseLevel = () => {
  if (magma.activeTabUseCases(tactics.domain).length > 0) {
    // The use cases on the level below are kept, but lose their parent.
    const deleted = magma.activeTabUseCases(tactics.domain).filter((useCase) => !useCase.permanent);
    const orphans = new Set(deleted.flatMap((useCase) => magma.getChildUseCases(useCase)));
    const orphansWarning =
      orphans.size === 0 ? '' : `\n\n${orphans.size} use case(s) on the level below will lose their parent.`;
    Swal.fire({
      title: `You are about to delete all ${magma.activeTab} use cases`,
      text: `This is a permanent and irreversible action.${orphansWarning}\n\nDo you wish to proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: 'green',
      confirmButtonText: `Yes, delete all ${magma.activeTab} use cases`,
      cancelButtonText: 'No, cancel',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        magma.removeActiveTabUseCases(tactics.domain);
      }
    });
  }
};

// Rename a use case when its ID field is committed (Enter, or leaving the field). Its children move along to the new ID.
// A refused rename (empty, with a space, or an ID that already exists) is explained, and the field shows the current ID
// again.
const renameUseCase = (useCase: UseCase, event: Event) => {
  const field = event.target as HTMLTextAreaElement;
  const problem = magma.renameUseCase(useCase.uid, field.value);
  if (problem) {
    field.value = useCase.id;
    Swal.fire({ icon: 'error', titleText: 'ID not changed', text: problem });
  }
};

// Enter in a field of one line ends editing, instead of adding a line.
const onTextKeydown = (field: string, event: KeyboardEvent) => {
  if (event.key === 'Enter' && SINGLE_LINE_FIELDS.includes(field) && !event.isComposing) {
    event.preventDefault();
    (event.target as HTMLTextAreaElement).blur();
  }
};

// A changed text field: line breaks become spaces in a field of one line. The ID is only renamed when the field is left.
const onTextInput = (useCase: UseCase, field: string, event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  if (SINGLE_LINE_FIELDS.includes(field) && /[\r\n]/.test(textarea.value)) {
    textarea.value = textarea.value.replace(/\r?\n|\r/g, ' ');
  }
  if (field !== 'id') {
    updateObjectField(useCase.uid, field, textarea.value);
  }
};

// The value of a field as the sheet gives it: text (also for numbers), the list of parent IDs, or the override checkbox.
const updateObjectField = (uid: string, field: string, value: string | string[] | boolean | undefined) => {
  magma.updateUseCase(uid, { [field]: value }, tactics.domain);
};

// A typed percentage: kept to digits with one decimal point and at most 100 (see percentageInput.ts), then saved. When
// the text changes, the cursor stays where it was.
const updatePercentage = (useCase: UseCase, field: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  const percentage = typedPercentage(input.value);
  if (percentage !== input.value) {
    const cursor = (input.selectionStart ?? input.value.length) - (input.value.length - percentage.length);
    input.value = percentage;
    input.setSelectionRange(Math.max(cursor, 0), Math.max(cursor, 0));
  }
  updateObjectField(useCase.uid, field, percentage);
};

// Turning the override off takes the visibility from the ATT&CK technique again (by setting the technique again).
const updateOverride = (useCase: UseCase, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  updateObjectField(useCase.uid, 'visibilityFromAttackTechniqueOverride', checked);
  if (!checked) {
    updateObjectField(useCase.uid, 'attackTechniqueId', useCase.attackTechniqueId);
  }
};

// Fields that are shown but cannot be changed: those of the permanent IN and THR use cases, and a visibility that
// comes from the use case's ATT&CK technique (unless it is overridden).
const isLocked = (useCase: UseCase, field: string) =>
  field === 'visibility'
    ? useCase.visibilityFromAttackTechnique && !useCase.visibilityFromAttackTechniqueOverride
    : useCase.permanent;

// The impacts and the risk do not apply to the permanent IN and THR use cases: their cells are hatched in grey, like
// 'n/a' in the legends, and empty.
const notApplicable = (useCase: UseCase, field: string) =>
  !!useCase.permanent && ['inImpact', 'thrImpact', 'outImpact', 'risk'].includes(field);

const cellStyle = (useCase: UseCase, field: string) =>
  notApplicable(useCase, field)
    ? { backgroundImage: NOT_DETECTABLE_STYLE.backgroundImage }
    : { backgroundColor: getBackgroundColor(useCase, field) };

const getBackgroundColor = (useCase: UseCase, field: string) => {
  if (['inImpact', 'thrImpact', 'outImpact'].includes(field)) {
    const total = Number(useCase.inImpact ?? 0) + Number(useCase.thrImpact ?? 0) + Number(useCase.outImpact ?? 0);
    return total == 100 ? 'white' : 'crimson';
  }

  if (field === 'risk') {
    return 'lightgoldenrodyellow';
  }

  if (useCase.permanent) {
    return 'lightgoldenrodyellow';
  }

  if (field === 'visibility') {
    if (useCase.visibilityFromAttackTechnique && !useCase.visibilityFromAttackTechniqueOverride) {
      return 'lightgoldenrodyellow';
    } else {
      return 'white';
    }
  }

  if (field === 'id') {
    const id = useCase.id;
    const allIds = magma.getAllIds(tactics.domain);
    const noDuplicateId = allIds.filter((item) => item === id).length <= 1;
    if (noDuplicateId) {
      return 'white';
    } else {
      return 'crimson';
    }
  }

  if (field === 'parentIds') {
    const parentIds = useCase.parentIds;
    const validParentIds =
      Array.isArray(parentIds) && parentIds.every((id) => magma.getAllIds(tactics.domain).includes(id));
    if (validParentIds) {
      return 'white';
    } else {
      return 'crimson';
    }
  }
};

// The use cases one level up that can be chosen as parent, sorted by ID. IDs that occur more than once are left out.
const parentLevelUseCases = computed(() => {
  const useCases =
    magma.activeTab === 'L3'
      ? magma.L2UseCases(tactics.domain)
      : magma.activeTab === 'L2'
        ? magma.L1UseCases(tactics.domain)
        : [];

  const idCounts = new Map<string, number>();
  useCases.forEach((useCase) => {
    idCounts.set(useCase.id, (idCounts.get(useCase.id) || 0) + 1);
  });

  return useCases.filter((useCase) => (idCounts.get(useCase.id) || 0) === 1).sort((a, b) => a.id.localeCompare(b.id));
});

const formatPercentage = (value: unknown) => Number(value).toFixed(2);
</script>

<template>
  <!-- The sheet scrolls sideways; the add button below it (in the caption, above the scroll bar) stays across the page
       with its text in view. -->
  <div class="sheet-scroll">
    <table border="1" class="fixed-table" :style="{ width: `${sheetWidth}px` }">
      <caption class="add-row">
        <button type="button" class="add-button" @click="addNewUseCase">+ Add use case</button>
      </caption>
      <thead>
        <tr>
          <!-- Deletes all use cases of this level. -->
          <th
            class="remove-col"
            v-hint="`Delete all ${magma.activeTab} use cases`"
            @click="confirmRemoveUseCaseLevel()"
            style="background-color: #e73030; color: white; cursor: pointer"
          >
            &#10806;
          </th>
          <th
            v-for="column in columns"
            :key="column.field"
            v-hint="`${column.description} Click to sort.`"
            class="explained sortable"
            :class="{ sorted: sort?.field === column.field }"
            :aria-sort="ariaSort(column.field)"
            :style="{ width: `${column.width}px` }"
            @click="toggleSort(column.field)"
          >
            {{ column.title
            }}<span v-if="sort?.field === column.field" class="sort-arrow" aria-hidden="true">
              {{ sort.direction === 'ascending' ? '▲' : '▼' }}</span
            >
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Rows for all use cases. -->
        <tr v-for="useCase in rows" :key="useCase.uid" @focusin="startEditing(useCase)" @focusout="stopEditing">
          <!-- Remove-use-case buttons; IN and THR cannot be deleted. -->
          <td class="remove-col" :class="{ 'not-deletable': useCase.permanent }">
            <button
              v-if="!useCase.permanent"
              class="remove-button"
              v-hint="'Delete this use case'"
              @click="confirmRemoveUseCase(useCase)"
            >
              &times;
            </button>
          </td>

          <td v-for="column in columns" :key="column.field">
            <!-- Editable fields -->
            <template v-if="column.editable">
              <input
                v-if="PERCENTAGE_INPUTS.includes(column.field)"
                type="text"
                inputmode="decimal"
                :value="notApplicable(useCase, column.field) ? '' : fieldValue(useCase, column.field)"
                @input="(event) => updatePercentage(useCase, column.field, event)"
                :disabled="isLocked(useCase, column.field)"
                :style="cellStyle(useCase, column.field)"
              />

              <div
                v-else-if="TEXT_FIELDS.includes(column.field)"
                class="text-field"
                :class="{ 'left-aligned': column.field === 'description' }"
                :style="cellStyle(useCase, column.field)"
                @click="($event.currentTarget as HTMLElement).querySelector('textarea')?.focus()"
              >
                <textarea
                  :value="textValue(useCase, column.field)"
                  @keydown="(event) => onTextKeydown(column.field, event)"
                  @input="(event) => onTextInput(useCase, column.field, event)"
                  @change="(event) => column.field === 'id' && renameUseCase(useCase, event)"
                  :disabled="isLocked(useCase, column.field)"
                ></textarea>
              </div>

              <OptionPicker
                v-else-if="column.field === 'parentIds'"
                :model-value="useCase.parentIds?.[0]"
                :options="parentLevelUseCases"
                noun="use case"
                :style="cellStyle(useCase, column.field)"
                @update:model-value="(id) => updateObjectField(useCase.uid, 'parentIds', [id])"
              />

              <OptionPicker
                v-else-if="column.field === 'attackTechniqueId'"
                :model-value="useCase.attackTechniqueId"
                :options="tactics.techniqueOptions"
                :search="searchTechniques"
                noun="technique"
                @update:model-value="(id) => updateObjectField(useCase.uid, 'attackTechniqueId', id)"
              />

              <label
                v-else-if="column.field === 'visibilityFromAttackTechniqueOverride'"
                class="override-toggle"
                v-hint="column.description"
              >
                <input
                  type="checkbox"
                  :checked="useCase.visibilityFromAttackTechniqueOverride"
                  @change="(event) => updateOverride(useCase, event)"
                />
                <span class="toggle-switch" aria-hidden="true"></span>
              </label>
            </template>

            <!-- Calculated fields -->
            <div v-else-if="column.field === 'L1nrChildren' || column.field === 'L2nrChildren'" class="uneditable">
              {{ magma.getChildUseCases(useCase).length }}
            </div>

            <div v-else-if="column.field === 'L1nrGrandChildren'" class="uneditable">
              {{ magma.getGrandChildUseCases(useCase).length }}
            </div>

            <div v-else-if="PERCENTAGES_SHOWN.includes(column.field)" class="uneditable">
              {{ formatPercentage(fieldValue(useCase, column.field)) }}
            </div>

            <input
              v-else-if="column.field === 'risk'"
              :value="useCase.permanent ? '' : formatPercentage(useCase.risk || 0)"
              :style="cellStyle(useCase, column.field)"
              disabled
            />

            <template v-else>
              {{ fieldValue(useCase, column.field) }}
            </template>
          </td>
        </tr>

        <!-- The empty rows add a little space (the table's border spacing) above and below the averages. -->
        <tr></tr>
        <tr v-if="magma.activeTab == 'L1'">
          <td style="border: none"></td>
          <td style="border: none"></td>
          <td style="border: none"></td>
          <td style="background-color: #eee">Averages &rarr;</td>
          <td style="border: none"></td>
          <td style="border: none"></td>
          <td style="background-color: #eee">{{ averages.visibility }}</td>
          <td style="background-color: #eee">{{ averages.implementation }}</td>
          <td style="background-color: #eee">{{ averages.effectiveness }}</td>
          <td style="background-color: #eee">{{ averages.weight }}</td>
          <td style="background-color: #eee">{{ averages.potential }}</td>
        </tr>
        <tr></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* The sheet scrolls sideways from window edge to window edge (past the 0.5rem margin of the page, App.vue), starting
   and ending 0.5rem from the edges. */
.sheet-scroll {
  overflow-x: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}

/* A row is three lines of text high; longer text in a text field scrolls. The search fields (OptionPicker.vue) use the
   same row height. The text is 13px, like the controls of the other pages. */
.fixed-table {
  --sheet-row-height: 52px; /* three lines of 16px, plus 2px padding above and below */
  --sheet-text-max-height: 52px;
  table-layout: fixed;
  border: 0; /* no frame around the sheet: the cells have their own borders, and the add button follows the rows */
}

/* Default cell settings, will be overwritten later. But gives more consistent feel. */
th,
td,
input {
  width: 140px;
  height: 30px;
  border: var(--border-control);
  border-radius: 4px;
  background-color: white;
}

/* The headers fit on one line: each column is as wide as its header needs (useCaseColumns.ts). */
th {
  font-size: 12.5px;
  font-weight: bold;
  padding: 4px 6px;
  white-space: nowrap;
  background-color: var(--color-sheet-header);
}

tr {
  font-size: 13px;
}

input {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 13px;
  width: 100%;
  border: 0px;
  min-height: var(--sheet-row-height);
}

th.remove-col {
  font-size: 17px;
  transform: rotateX(180deg);
  padding: 3px;
}

td.remove-col {
  background-color: var(--color-remove);
}

/* IN and THR cannot be deleted: their delete cell is hatched in red. */
td.remove-col.not-deletable {
  background-color: #fbe4e1;
  background-image: repeating-linear-gradient(135deg, #de7b72 0 4px, #fbe4e1 4px 8px);
}

/* A click on a column header sorts the sheet by it (the pointing hand says it can be clicked; its description still shows
   shortly after the mouse comes on it, v-hint); the sorted column's header is a little darker, with an arrow. */
th.sortable {
  cursor: pointer;
}

th.sorted {
  background-color: #b1c4e3;
}

.sort-arrow {
  margin-left: 4px;
  font-size: 10px;
}
button.remove-button {
  width: 100%;
  height: 100%;
  font-size: 18px;
  background-color: var(--color-remove);
  color: white;
  border: none;
  cursor: pointer;
}

/* Below the sheet: the caption is as wide as the table, so the button can stay at the left of the visible part (sticky)
   while the sheet scrolls sideways. It is as wide as the window minus the page margins, or as the sheet when that is
   narrower. */
.add-row {
  caption-side: bottom;
  text-align: left;
}

.add-button {
  position: sticky;
  left: 0;
  display: block;
  width: min(calc(100vw - 1rem), 100%);
  height: 30px;
  margin: 4px 0;
  background-color: var(--color-add);
  color: var(--color-add-text);
  border: 1.5px solid var(--color-add-border);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.add-button:hover {
  background-color: var(--color-add-hover);
}

.remove-col {
  width: 28px; /* DELETE_COLUMN_WIDTH */
}

input,
.uneditable {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.uneditable {
  background-color: lightgoldenrodyellow;
}

/* The override: a switch (the same look as the toggles of SelectionTool.vue), and the whole cell can be clicked. */
.override-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: var(--sheet-row-height);
  cursor: pointer;
}

.override-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  min-height: 0;
}

.override-toggle:has(input:focus-visible) {
  outline: auto 1px;
  outline: -webkit-focus-ring-color auto 1px;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: var(--color-switch-off);
  border-radius: 34px;
  transition: 0.4s;
}

.toggle-switch::before {
  position: absolute;
  content: '';
  width: 16px;
  height: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.override-toggle input:checked + .toggle-switch {
  background-color: var(--color-switch-on);
}

.override-toggle input:checked + .toggle-switch::before {
  transform: translateX(16px);
}

/* The ID, name, description and data source: centred vertically (and all but the description also horizontally, like
   the other cells). The field is as high as its text, up to three lines; longer text scrolls, with a thin scroll bar. */
.text-field {
  display: flex;
  align-items: center;
  height: 100%;
  cursor: text;
}

.text-field textarea {
  field-sizing: content;
  width: 100%;
  max-height: var(--sheet-text-max-height);
  padding: 2px 6px; /* small, so nothing of a fourth line shows below the third */
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  line-height: 16px; /* after font, which would reset it */
  text-align: center;
  overflow-wrap: anywhere; /* a long ID without spaces wraps too */
  resize: none;
}

/* A thin grey scroll bar (3px in Chrome, Edge and Safari; Firefox only has a standard thin one). */
.text-field textarea::-webkit-scrollbar {
  width: 3px;
}

.text-field textarea::-webkit-scrollbar-thumb {
  border-radius: 1.5px;
  background-color: #888;
}

.text-field textarea::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

@supports not selector(::-webkit-scrollbar) {
  .text-field textarea {
    scrollbar-width: thin;
    scrollbar-color: #888 transparent;
  }
}

.text-field.left-aligned textarea {
  text-align: left;
}

/* The focus ring goes around the whole cell, like that of the other fields, not only around the text. */
.text-field:focus-within {
  outline: auto 1px;
  outline: -webkit-focus-ring-color auto 1px; /* the browser's own focus ring colour, where it exists */
}

.text-field textarea:focus {
  outline: none;
}
</style>
