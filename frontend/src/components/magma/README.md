# MaGMa page components

The MaGMa page: the use case sheets, the heatmap, the insights and the summary.

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the use case sheets, selecting their cells, their frozen columns, their sorting, their percentage and search fields, the tab bar with undo and redo, the undo keys, and the import summary |
| [`heatmap/`](heatmap/) | Heatmap tab: the ATT&CK matrix coloured by use case scores, and its filters |
| [`insights/`](insights/) | Insights tab: the MaGMa charts |
| [`cellNavigation.ts`](cellNavigation.ts) | Moving the cursor between the cells of a sheet with the keyboard, as in a spreadsheet |
| [`cellSelection.ts`](cellSelection.ts) | A block of selected cells in a sheet, from the cell where the selection started to where it ends |
| [`copiedCells.ts`](copiedCells.ts) | Cells copied from or to a spreadsheet: the text with tabs and line breaks on the clipboard |
| [`frozenColumns.ts`](frozenColumns.ts) | Where the delete column, ID and name stick while a sheet scrolls sideways |
| [`importSummaryContent.ts`](importSummaryContent.ts) | The dialog after loading a MaGMa file with problems: the use cases that were not loaded, and the warnings, as lists |
| [`listPlacement.ts`](listPlacement.ts) | Where the list of the search field goes: below the field, or above it near the bottom of the window |
| [`MagmaSummary.vue`](MagmaSummary.vue) | Summary tab: early detection, the risk per business risk, averages and counts |
| [`OptionPicker.vue`](OptionPicker.vue) | The search field of the L2 and L3 sheets, for the parent use case and the ATT&CK (sub-)technique |
| [`optionSearch.ts`](optionSearch.ts) | The searches of the search field: by ID or name, and for techniques by the start of the ID |
| [`pastedValues.ts`](pastedValues.ts) | A value pasted into a cell of a sheet, read for its column: the value to save, or why it does not fit |
| [`percentageInput.ts`](percentageInput.ts) | What a typed percentage is kept to: digits with one decimal point (a comma counts as one), at most 100 |
| [`SheetTabs.vue`](SheetTabs.vue) | The tab bar, with the buttons to undo and redo, and to load and save a MaGMa YAML file |
| [`undoKeys.ts`](undoKeys.ts) | The keys for undo and redo, and the fields that keep their own undo |
| [`useCaseColumns.ts`](useCaseColumns.ts) | The columns of the L1, L2 and L3 sheets |
| [`useCaseSort.ts`](useCaseSort.ts) | Sorting a sheet by a column (a click on its header), only on the screen |
| [`UseCaseTable.vue`](UseCaseTable.vue) | The L1, L2 or L3 sheet: one row per use case, sortable by each column |
| [`useCellSelection.ts`](useCellSelection.ts) | Selecting cells with the mouse: dragging, shift-click, and ending the selection |
