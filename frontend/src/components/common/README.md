# Shared components

Components and helpers that several pages use.

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the bar chart, the bar colour, the bar width, the hint, the short message, the page's scroll bar and the technique tooltip |
| [`BarChart.vue`](BarChart.vue) | Horizontal bar chart, used by all charts on the Insights page and the MaGMa Insights tab |
| [`barColor.ts`](barColor.ts) | The chart colours: a scale from red (0%) to green (100%), and a colour per MaGMa score and for counts |
| [`barWidth.ts`](barWidth.ts) | Width of a bar, so bars and their numbers stay inside the chart |
| [`ControlBox.vue`](ControlBox.vue) | A box in a control panel: a label, optionally a value, and the control |
| [`hint.ts`](hint.ts) | `v-hint`: a short explanation that appears shortly after the mouse comes on an element, such as a column header |
| [`notDetectableStyle.ts`](notDetectableStyle.ts) | Striped style for techniques without data components, in the matrix and its legend |
| [`notify.ts`](notify.ts) | A short message at the top right for an action that went well, such as loading a file |
| [`PageScrollbar.vue`](PageScrollbar.vue) | The page's scroll bar: a thin translucent bar over the right edge, instead of the browser's |
| [`scrollbarGeometry.ts`](scrollbarGeometry.ts) | The size and position of the page's scroll bar, and how far dragging it scrolls |
| [`SelectionTool.vue`](SelectionTool.vue) | Selects groups or data components, on the DeTT&CT page and the MaGMa heatmap |
| [`TechniqueTooltip.vue`](TechniqueTooltip.vue) | The tooltip of a technique in the DeTT&CT matrix and the MaGMa heatmap |
| [`tooltipPlacement.ts`](tooltipPlacement.ts) | Where a technique's tooltip goes: next to its button, inside the window |
| [`useTechniqueTooltip.ts`](useTechniqueTooltip.ts) | When a technique's tooltip is shown: on hover, or pinned by a click |
