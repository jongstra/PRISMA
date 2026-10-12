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
.sheet-tabs {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 1px solid #777;
}

.sheet-tab {
  width: 90px; /* Set the width of each tab */
  padding: 8px;
  margin-right: 2px;
  background-color: #ddd;
  border: 2px solid #777;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  position: relative;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  text-align: center; /* Center the text within each tab */
}

.sheet-tab:hover {
  background-color: hsla(160, 100%, 37%, 0.2);
}

.sheet-tab.active {
  background-color: rgb(57, 55, 139);
  color: white;
  border-bottom-color: transparent;
}

.load-button,
.save-button {
  font-size: 14px;
  background-color: #d61b1b;
  border: 2px solid black;
  border-radius: 4px;
  color: rgb(255, 255, 255);
  padding: 7.5px 7.5px;
  margin-bottom: 1px;
  cursor: pointer;
}

.load-button {
  margin-left: 53px;
}

.save-button {
  margin-left: 5px;
}

.load-button:hover,
.save-button:hover {
  background-color: rgb(214, 133, 27);
  color: rgb(255, 255, 255);
}
</style>
