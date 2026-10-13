<script setup lang="ts">
// The L1, L2 or L3 sheet of the MaGMa page (the active tab): one row per use case of the current domain, with a button
// to add a use case. The columns are defined in useCaseColumns.ts.
import Swal from 'sweetalert2';
import { computed } from 'vue';
import { magmaStore, type UseCase } from '@/stores/magma';
import { tacticsStore } from '@/stores/tactics';
import { USE_CASE_COLUMNS, type SheetLevel } from './useCaseColumns';
import OptionPicker from './OptionPicker.vue';
import { searchTechniques } from './optionSearch';
import { vHint } from '@/components/common/hint';

const magma = magmaStore();
const tactics = tacticsStore();

const columns = computed(() => USE_CASE_COLUMNS[magma.activeTab as SheetLevel]);
const useCases = computed(() => magma.activeTabUseCases(tactics.domain));

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

// A typed percentage: kept between 0 and 100 (see validateAndFormat), then saved.
const updatePercentage = (useCase: UseCase, field: string, event: Event) => {
  validateAndFormat(event);
  updateObjectField(useCase.uid, field, (event.target as HTMLInputElement).value);
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

const getBackgroundColor = (useCase: UseCase, field: string) => {
  if (['inImpact', 'thrImpact', 'outImpact'].includes(field)) {
    if (useCase.permanent) {
      return 'black';
    } else if (Number(useCase.inImpact ?? 0) + Number(useCase.thrImpact ?? 0) + Number(useCase.outImpact ?? 0) == 100) {
      return 'white';
    } else {
      return 'crimson';
    }
  }

  if (field === 'risk') {
    return useCase.permanent ? 'black' : 'lightgoldenrodyellow';
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

// Validation method to limit input to numbers with up to two decimal places, and rangebound between 0 and 100.
const validateAndFormat = (event: Event) => {
  const inputElement = event.target as HTMLInputElement;
  const value = inputElement.value;

  // Parse the value to a float
  const parsedValue = parseFloat(value);

  // Check if the parsed value is within the range [0, 100], and otherwise force it to be within this value.
  if (!isNaN(parsedValue)) {
    if (parsedValue < 0) {
      inputElement.value = '0';
    } else if (parsedValue > 100) {
      inputElement.value = '100';
    }
  }
};
</script>

<template>
  <table border="1" class="fixed-table">
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
          v-hint="column.description"
          class="explained"
          :style="{ width: `${column.width}px` }"
        >
          {{ column.title }}
        </th>
      </tr>
    </thead>
    <tbody>
      <!-- Rows for all use cases. -->
      <tr v-for="useCase in useCases" :key="useCase.uid">
        <!-- Remove-use-case buttons -->
        <td class="remove-col">
          <button
            v-if="!useCase.permanent"
            class="remove-button"
            v-hint="'Delete this use case'"
            @click="confirmRemoveUseCase(useCase)"
            style="background-color: #e73030; color: white; border: none; cursor: pointer; width: 100%; height: 100%"
          >
            &times;
          </button>
        </td>

        <td v-for="column in columns" :key="column.field">
          <!-- Editable fields -->
          <template v-if="column.editable">
            <input
              v-if="PERCENTAGE_INPUTS.includes(column.field)"
              type="number"
              :value="fieldValue(useCase, column.field)"
              @input="(event) => updatePercentage(useCase, column.field, event)"
              :disabled="isLocked(useCase, column.field)"
              :style="{ backgroundColor: getBackgroundColor(useCase, column.field) }"
            />

            <div
              v-else-if="TEXT_FIELDS.includes(column.field)"
              class="text-field"
              :class="{ 'left-aligned': column.field === 'description' }"
              :style="{ backgroundColor: getBackgroundColor(useCase, column.field) }"
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
              :style="{ backgroundColor: getBackgroundColor(useCase, column.field) }"
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
            :style="{ backgroundColor: getBackgroundColor(useCase, column.field) }"
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
    <tfoot>
      <tr>
        <td colspan="10" class="add-button-cell">
          <button @click="addNewUseCase">+ ADD NEW USE CASE +</button>
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<style scoped>
/* A row is three lines of text high; longer text in a text field scrolls. The search fields (OptionPicker.vue) use the
   same row height. */
.fixed-table {
  --sheet-row-height: 59px; /* three lines of 17px, plus room around them */
  --sheet-text-max-height: 55px; /* three lines of 17px, plus 2px padding above and below */
  width: 100%;
  table-layout: fixed;
}

/* Default cell settings, will be overwritten later. But gives more consistent feel. */
th,
td,
input {
  width: 140px;
  height: 30px;
  border: 2px solid rgb(42, 42, 42);
  border-radius: 4px;
  background-color: white;
}

th {
  font-size: 14px;
  font-weight: bold;
  padding: 7px;
  background-color: rgb(196, 213, 234);
}

tr {
  font-size: 14px;
}

input {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  width: 100%;
  border: 0px;
  min-height: var(--sheet-row-height);
}

th.remove-col {
  font-size: 28px;
  transform: rotateX(180deg);
  padding: 3px;
}

td.remove-col {
  background-color: #e73030;
}
button.remove-button {
  font-size: 30px;
}

.add-button-cell {
  border: 0px;
  text-align: center; /* Center the button within the cell */
}

.add-button-cell button {
  width: calc(100vw - 40px);
  padding: 10px;
  background-color: green;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  float: left;
  font-size: 14px;
}

.remove-col {
  width: 40px;
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

th.explained {
  cursor: help; /* the description shows shortly after the mouse comes on the header (v-hint) */
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
  background-color: #ccc;
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
  background-color: #2196f3;
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
  font-size: 14px;
  line-height: 17px; /* after font, which would reset it */
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
