<script setup lang="ts">
// The tab bar of the MaGMa page, with the buttons to load and save the use cases as a MaGMa YAML file.
import Swal from 'sweetalert2';
import { magmaStore, type UseCaseFromFile } from '@/stores/magma';
import { isYamlFile, readYamlFile } from '@/io/readYamlFile';
import { importSummary, magmaFileDomains, readMagmaFile, writeMagmaFile } from '@/io/magmaFile';
import { downloadFile } from '@/io/downloadFile';
import { DOMAIN_NAMES, domainNames } from '@/domain/domains';
import { notifySuccess } from '@/components/common/notify';
import { importSummaryContent } from './importSummaryContent';

const magma = magmaStore();
const tabs = ['L1', 'L2', 'L3', 'Heatmap', 'Insights', 'Summary'];

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

.load-button {
  margin-left: auto;
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
