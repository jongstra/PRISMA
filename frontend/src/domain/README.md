# Domain logic

Calculations and checks without user interface, so they can be tested on their own (see the `__tests__` folders).

| Name | Description |
|---|---|
| [`__tests__/`](__tests__/) | Tests for the domain list |
| [`attack/`](attack/) | Reading DeTT&CT files (`dettect.ts`) and visibility per technique (`visibility.ts`) |
| [`magma/`](magma/) | MaGMa scores and risk (`calculations.ts`), means per data source (`dataSources.ts`), heatmap values (`heatmap.ts`), Summary tab numbers (`summary.ts`), import checks (`validation.ts`) |
| [`domains.ts`](domains.ts) | The supported ATT&CK domains and their names in the app (Enterprise, Mobile, ICS) |
