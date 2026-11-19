# Stores

The shared state of the application (Pinia), used by all pages.

| Name                       | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| [`__tests__/`](__tests__/) | Tests for both stores and the undo history |
| [`magma.ts`](magma.ts) | MaGMa use cases: editing, undo and redo, loading and scores |
| [`tactics.ts`](tactics.ts) | ATT&CK catalog, DeTT&CT visibility, filters and selections |
| [`undoHistory.ts`](undoHistory.ts) | The undo history: a copy of the use cases from before each change |
