# DeTT&CT page components

Components of the DeTT&CT page: the ATT&CK matrix with visibility, and its filters.

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the texts of the controls and the start positions of the sliders |
| [`controlValues.ts`](controlValues.ts) | The texts of the controls: the slider values and what the platforms filter lets through |
| [`FileUploadButtonYaml.vue`](FileUploadButtonYaml.vue) | Loads a DeTT&CT data source file |
| [`SearchBar.vue`](SearchBar.vue) | Searches techniques by name or ID |
| [`TacticColumn.vue`](TacticColumn.vue) | One tactic column of the matrix |
| [`TechniqueAttributeFilter.vue`](TechniqueAttributeFilter.vue) | Filters techniques by platform |
| [`TechniqueButton.vue`](TechniqueButton.vue) | One technique in the matrix, with its tooltip |
| [`TechniqueTotalOccurrenceFilterBinned.vue`](TechniqueTotalOccurrenceFilterBinned.vue) | Filters techniques by how often they are used |
| [`TechniqueVisibilityPercentageFilter.vue`](TechniqueVisibilityPercentageFilter.vue) | Filters techniques by visibility percentage |
| [`VisibilityLegend.vue`](VisibilityLegend.vue) | Colour legend for visibility |
