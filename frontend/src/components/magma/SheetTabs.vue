<script setup lang="ts">
// The tab bar of the MaGMa page, with the buttons to undo and redo changes to the use cases, and to load and save them as
// a MaGMa YAML file.
import Swal from 'sweetalert2';
import { onMounted, onUnmounted } from 'vue';
import { magmaStore, type UseCaseFromFile } from '@/stores/magma';
import { vHint } from '@/components/common/hint';
import { fieldHasOwnUndo, isMac, shortcuts, undoKey } from './undoKeys';
import { isYamlFile, readYamlFile } from '@/io/readYamlFile';
import { importSummary, magmaFileDomains, readMagmaFile, writeMagmaFile } from '@/io/magmaFile';
import { downloadFile } from '@/io/downloadFile';
import { DOMAIN_NAMES, domainNames } from '@/domain/domains';
import { closeUndoableNotice, notifySuccess } from '@/components/common/notify';
import { importSummaryContent } from './importSummaryContent';

const magma = magmaStore();
const tabs = ['L1', 'L2', 'L3', 'Heatmap', 'Insights', 'Summary'];

// Undo and redo (see recordStep in the store) show the sheet and domain of the change, so it can be seen.
const keys = shortcuts(isMac());
// An undo also closes the message about the last change (with its own Undo button): it no longer fits.
const undo = () => {
  closeUndoableNotice();
  magma.undo();
};
const redo = () => magma.redo();

// Ctrl+Z and Ctrl+Shift+Z (⌘Z and ⇧⌘Z on a Mac) anywhere on the MaGMa page, except in a field with its own undo and
// while a dialog is open (a short message at the top right, such as 'MaGMa file loaded', is not a dialog).
const dialogOpen = () => Swal.isVisible() && !Swal.getPopup()?.classList.contains('swal2-toast');
const onKeydown = (event: KeyboardEvent) => {
  const action = undoKey(event);
  if (!action || fieldHasOwnUndo(event.target as Element) || dialogOpen()) {
    return;
  }
  event.preventDefault();
  if (action === 'undo') {
    undo();
  } else {
    redo();
  }
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

const exportYaml = () => {
  downloadFile(writeMagmaFile(magma.domainSortedUseCases), 'magma_data.yaml', 'text/yaml');
  magma.markAsSaved();
};

// Load a MaGMa YAML file. Its use cases replace the current use cases of the domains in the file; the other domains stay
// as they are. A dialog asks for confirmation when current use cases will be replaced, and nothing changes
// when the file cannot be read. Afterwards, a short message confirms it, or a dialog lists the use cases that were not
// loaded and why, and the warnings.
const importYaml = async (event: Event) => {
  const fileInput = event.target as HTMLInputElement;
  const file = fileInput.files?.[0];
  fileInput.value = ''; // Reset the input, so selecting the same file again is registered as a change.
  if (!file) {
    return;
  }

  if (!isYamlFile(file)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid file type',
      text: 'Please select a valid MaGMa YAML file.',
    });
    return;
  }

  let useCases: UseCaseFromFile[];
  let domains: string[];
  try {
    useCases = readMagmaFile(await readYamlFile(file));
    domains = magmaFileDomains(useCases);
  } catch (error) {
    Swal.fire({
      icon: 'error',
      titleText: 'The file was not loaded',
      text: `${(error as Error).message} Nothing was changed.`,
    });
    return;
  }

  // Ask for confirmation when current use cases will be replaced.
  const currentCount = (domain: string) =>
    magma.useCases.filter((useCase) => !useCase.permanent && useCase.domain === domain).length;
  const replaced = domains.filter((domain) => currentCount(domain) > 0);
  if (replaced.length > 0) {
    const kept = Object.keys(DOMAIN_NAMES).filter((domain) => !domains.includes(domain));
    const replacedText = replaced
      .map((domain) => `${DOMAIN_NAMES[domain]} (${currentCount(domain)} use cases)`)
      .join(' and ');
    const keptText = kept.length > 0 ? ` ${domainNames(kept)} will stay as they are.` : '';
    const result = await Swal.fire({
      icon: 'warning',
      titleText: 'Replace the current use cases?',
      text: `The file contains use cases for ${domainNames(domains)}. It replaces the current use cases of ${replacedText}.${keptText}`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: 'green',
      confirmButtonText: 'Yes, load the file',
      cancelButtonText: 'No, cancel',
      reverseButtons: true,
    });
    if (!result.isConfirmed) {
      return;
    }
  }

  const summary = importSummary(magma.loadUseCases(useCases));
  if (summary.problems) {
    Swal.fire({
      icon: 'warning',
      titleText: 'Import Summary',
      html: importSummaryContent(summary),
      confirmButtonText: 'OK',
    });
  } else {
    const count = summary.imported === 1 ? '1 use case' : `${summary.imported} use cases`;
    notifySuccess(`MaGMa file loaded: ${count} for ${domainNames(domains)}`);
  }
};
</script>

<template>
  <div class="sheet-tabs">
    <button
      v-for="tab in tabs"
      :key="tab"
      class="sheet-tab"
      :class="{ active: magma.activeTab === tab }"
      @click="magma.activeTab = tab"
    >
      {{ tab }}
    </button>
    <div class="undo-redo">
      <button
        class="undo-button"
        :disabled="!magma.undoDescription"
        v-hint="magma.undoDescription ? `Undo: ${magma.undoDescription} (${keys.undo})` : undefined"
        aria-label="Undo"
        @click="undo"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      </button>
      <button
        class="redo-button"
        :disabled="!magma.redoDescription"
        v-hint="magma.redoDescription ? `Redo: ${magma.redoDescription} (${keys.redo})` : undefined"
        aria-label="Redo"
        @click="redo"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </svg>
      </button>
    </div>
    <input id="importYamlFile" type="file" @change="importYaml" style="display: none" />
    <label for="importYamlFile" class="load-button">Load MaGMa YAML</label>
    <label class="save-button" @click="exportYaml">Save MaGMa YAML</label>
  </div>
</template>

<style scoped>
/* The tabs, and at the right the Load and Save buttons, which end where the control panels end (960px wide). */
.sheet-tabs {
  display: flex;
  align-items: center;
  padding-right: max(0px, calc(100% - 960px));
  background-color: var(--color-tab-bar);
  border-bottom: 1px solid var(--color-box-border);
}

/* As high as the Load and Save buttons, so the tabs start at the top, where the content of the other pages starts. */
.sheet-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 30px;
  padding: 0 8px;
  margin-right: 2px;
  background-color: var(--color-box);
  border: 1px solid var(--color-box-border);
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  position: relative;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  text-align: center; /* Center the text within each tab */
}

.sheet-tab:hover {
  background-color: hsla(160, 100%, 37%, 0.2);
}

.sheet-tab.active {
  background-color: var(--color-accent);
  color: white;
  border-bottom-color: transparent;
}

/* The same look as the Load button of the DeTT&CT page (FileUploadButtonYaml.vue). */
.load-button,
.save-button {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  background-color: var(--color-action);
  border: 1px solid transparent;
  border-radius: 5px;
  color: rgb(255, 255, 255);
  cursor: pointer;
}

/* Undo and redo: curved arrows, greyed out when there is nothing to undo or redo. */
.undo-redo {
  display: flex;
  gap: 3px;
  margin-left: auto;
  margin-right: 6px;
}

.undo-redo button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--color-box-border);
  border-radius: 5px;
  background-color: white;
  color: var(--color-menu-text);
  cursor: pointer;
}

.undo-redo button:disabled {
  color: var(--color-slider-track);
  cursor: default;
}

.undo-redo svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.save-button {
  margin-left: 3px;
}

.load-button:hover,
.save-button:hover {
  background-color: var(--color-action-hover);
  color: rgb(255, 255, 255);
}
</style>
