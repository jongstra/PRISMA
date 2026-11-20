<script setup lang="ts">
// The tab bar of the MaGMa page, with the buttons to undo and redo changes to the use cases, and to load and save them as
// a MaGMa YAML file.
import Swal from 'sweetalert2';
import { onMounted, onUnmounted, ref } from 'vue';
import { magmaStore, type ImportResult, type UseCaseFromFile } from '@/stores/magma';
import { vHint } from '@/components/common/hint';
import { fieldHasOwnUndo, isMac, shortcuts, undoKey } from './undoKeys';
import { isYamlFile, readYamlFile } from '@/io/readYamlFile';
import { importSummary, magmaFileDomains, readMagmaFile, writeMagmaFile } from '@/io/magmaFile';
import { downloadFile } from '@/io/downloadFile';
import { DOMAIN_NAMES, domainNames } from '@/domain/domains';
import { closeUndoableNotice, notifySuccess } from '@/components/common/notify';
import { importSummaryContent } from './importSummaryContent';

const magma = magmaStore();
const fileInput = ref<HTMLInputElement | null>(null); // the hidden file field that Load opens
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

  // A file that cannot be read, or that fails to load, changes nothing.
  const notLoaded = (error: unknown) =>
    Swal.fire({
      icon: 'error',
      titleText: 'The file was not loaded',
      text: `${(error as Error).message} Nothing was changed.`,
    });

  let useCases: UseCaseFromFile[];
  let domains: string[];
  try {
    useCases = readMagmaFile(await readYamlFile(file));
    domains = magmaFileDomains(useCases);
  } catch (error) {
    notLoaded(error);
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

  let result: ImportResult;
  try {
    result = magma.loadUseCases(useCases);
  } catch (error) {
    notLoaded(error);
    return;
  }
  const summary = importSummary(result);
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
    <div class="tab-group">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="sheet-tab"
        :class="{ active: magma.activeTab === tab }"
        @click="magma.activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>
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
    <!-- Real buttons, so Tab and Enter reach them; Load opens the hidden file field. -->
    <input ref="fileInput" id="importYamlFile" type="file" @change="importYaml" style="display: none" />
    <button type="button" class="load-button" @click="fileInput?.click()">Load MaGMa YAML</button>
    <button type="button" class="save-button" @click="exportYaml">Save MaGMa YAML</button>
  </div>
</template>

<style scoped>
/* The tabs, and at the right undo, redo, Load and Save, which end where the menu bars of the header end (960px wide).
   The content of every tab starts 5px below them, as the page content starts 5px below the header. In a narrower
   window the tabs get a row of their own (see the end). */
.sheet-tabs {
  display: flex;
  align-items: center;
  max-width: 960px;
}

/* The tabs are a menu bar like the two in the header (App.vue): one grey box, the chosen tab a purple button, and a thin
   line between the others. The box is as high as the Load and Save buttons (30px); its text is a bit smaller than the
   header's, as it is a level below. */
.tab-group {
  display: flex;
  width: 560px;
  padding: 2px;
  background-color: var(--color-menu-bar);
  border: 1px solid var(--color-header-line);
  border-radius: var(--radius-frame);
}

.sheet-tab {
  position: relative;
  flex-grow: 1;
  width: 0; /* all tabs equally wide */
  height: 24px;
  margin: 0 2px;
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: var(--radius-box);
  color: var(--color-menu-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.1s;
}

.sheet-tab:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.sheet-tab + .sheet-tab::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 4px;
  bottom: 4px;
  border-left: 1px solid var(--color-header-line);
}

.sheet-tab.active {
  background-color: var(--color-accent);
  color: white;
}

.sheet-tab.active::before,
.sheet-tab.active + .sheet-tab::before {
  display: none;
}

/* The same look as the Load button of the DeTT&CT page (FileUploadButtonYaml.vue). */
.load-button,
.save-button {
  display: flex;
  font-family: inherit;
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

.load-button:focus-visible,
.save-button:focus-visible {
  outline: 2px solid var(--color-action);
  outline-offset: 2px;
}

/* Below 940px (where the heatmap controls go in two columns) the tabs fill a row of their own, like the menu bars above
   them, with undo, redo, Load and Save on the row below, at the right. On a phone (below 580px) the tabs are two rows
   of three, and Load and Save share the width next to undo and redo. */
@media (max-width: 940px) {
  .sheet-tabs {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .tab-group {
    width: 100%;
  }
}

@media (max-width: 580px) {
  .tab-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    row-gap: 2px;
  }

  .sheet-tab {
    width: auto;
  }

  .sheet-tab:nth-child(4)::before {
    display: none; /* the first tab of the second row has no line before it */
  }

  .load-button,
  .save-button {
    flex: 1;
    justify-content: center;
    padding: 0 6px;
  }
}
</style>
