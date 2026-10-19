# MaGMa heatmap

The Heatmap tab of the MaGMa page: the ATT&CK matrix coloured by use case scores, with its settings and filters.

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the name of the score and the green of a score |
| [`Heatmap.vue`](Heatmap.vue) | The tab itself: the controls in one row, and the matrix |
| [`HeatmapButton.vue`](HeatmapButton.vue) | One technique in the heatmap, with its tooltip |
| [`HeatmapButtonColumn.vue`](HeatmapButtonColumn.vue) | One tactic column of the heatmap |
| [`heatmapFill.ts`](heatmapFill.ts) | The green of a score, laid over the base colour of a button or swatch |
| [`HeatmapLegend.vue`](HeatmapLegend.vue) | The colours of the heatmap: not detectable, no use cases, and a score from 0 to 100% |
| [`HeatmapScoreFilter.vue`](HeatmapScoreFilter.vue) | Chooses the scores the heatmap colours by |
| [`HeatmapSearchBar.vue`](HeatmapSearchBar.vue) | Searches techniques in the heatmap |
| [`HeatmapSliderFilter.vue`](HeatmapSliderFilter.vue) | Hides the techniques below a minimum score |
| [`scoreName.ts`](scoreName.ts) | The name of the score the heatmap colours by, such as 'weight' or 'V × I' |
