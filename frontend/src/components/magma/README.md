# MaGMa page components

The MaGMa page: the use case sheets, the heatmap, the insights and the summary.

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the use case sheets, their sorting, their search field and the import summary |
| [`heatmap/`](heatmap/) | Heatmap tab: the ATT&CK matrix coloured by use case scores, and its filters |
| [`insights/`](insights/) | Insights tab: the MaGMa charts |
| [`importSummaryContent.ts`](importSummaryContent.ts) | The dialog after loading a MaGMa file with problems: the use cases that were not loaded, and the warnings, as lists |
| [`listPlacement.ts`](listPlacement.ts) | Where the list of the search field goes: below the field, or above it near the bottom of the window |
| [`MagmaSummary.vue`](MagmaSummary.vue) | Summary tab: early detection, the risk per business risk, averages and counts |
| [`OptionPicker.vue`](OptionPicker.vue) | The search field of the L2 and L3 sheets, for the parent use case and the ATT&CK (sub-)technique |
| [`optionSearch.ts`](optionSearch.ts) | The searches of the search field: by ID or name, and for techniques by the start of the ID |
| [`SheetTabs.vue`](SheetTabs.vue) | The tab bar, with the buttons to load and save a MaGMa YAML file |
| [`useCaseColumns.ts`](useCaseColumns.ts) | The columns of the L1, L2 and L3 sheets |
| [`useCaseSort.ts`](useCaseSort.ts) | Sorting a sheet by a column (a click on its header), only on the screen |
| [`UseCaseTable.vue`](UseCaseTable.vue) | The L1, L2 or L3 sheet: one row per use case, sortable by each column |
