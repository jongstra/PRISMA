# Browser smoke tests

Tests that use the built app in the installed Chrome, as a user would: open the pages, load the example files from
[`examples/`](../../examples/), switch tabs, and save a MaGMa file. Run them with `npm run test-e2e` in `frontend/`; the
settings are in [`playwright.config.ts`](../playwright.config.ts).

| Name | Description |
|---|---|
| [`smoke.spec.ts`](smoke.spec.ts) | The tests: the DeTT&CT page per domain, the Insights page, every MaGMa tab, and saving and loading a MaGMa file |
| [`tsconfig.json`](tsconfig.json) | TypeScript settings for the tests |
