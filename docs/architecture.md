# How PRISMA is built

PRISMA is a web app that runs entirely in your browser: the files you load are read there and are not sent anywhere. A few Python tools prepare its data beforehand. How PRISMA calculates is in [calculations.md](calculations.md), and its files are described in [data-formats.md](data-formats.md).

## Where PRISMA fits

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/overview-dark.png">
  <img src="images/overview.png" alt="Outside PRISMA: data sources go into DeTT&amp;CT; DeTTeCTinator reads your SIEM or EDR and can write the DeTT&amp;CT file (not yet tested with PRISMA); your detection capability, mapped to ATT&amp;CK, becomes MaGMa's L3 use cases by hand or by script; a risk analysis gives MaGMa's L1 business risks. Inside PRISMA: the visibility per technique from the DeTT&amp;CT file, the use case performance and the risk score per business risk from the MaGMa file; visibility and use case performance together show where detection can improve.">
</picture>

PRISMA reads two files. A DeTT&CT file describes your data sources and how complete they are; you write it by hand, with the [DeTT&CT Editor](https://rabobank-cdc.github.io/dettect-editor/#/datasources), or generate it with [DeTTeCTinator](https://github.com/siriussecurity/dettectinator) from your SIEM or EDR (not yet tested with PRISMA). A MaGMa file describes your use cases on three levels, from your business risks (L1) to your detection rules (L3). DeTTeCTinator can also list your detection rules with their ATT&CK techniques; PRISMA does not read that list directly: you turn it into L3 use cases yourself, for example with `tools/convert_manual_excel.py`.

From the two files PRISMA calculates the visibility per technique, the performance of your use cases and the risk score per business risk; visibility and performance together show where detection can improve. Everything outside the dashed box happens outside PRISMA: PRISMA has no connection to these systems. The original figure is [`MaGMa_2.0_overview.png`](MaGMa_2.0_overview.png).

## The big picture

```mermaid
flowchart LR
  subgraph tools["tools/: Python, run now and then"]
    stix["MITRE ATT&CK files<br/>(downloaded)"] --> notebook["build_attack_catalog.ipynb"]
    dettectSources["DeTT&CT data sources<br/>(dettect_files/)"] --> notebook
    excel["MaGMa template, or<br/>a list of rules (.xlsx)"] --> converters["convert_magma_excel.py<br/>convert_manual_excel.py"]
  end
  subgraph yours["Your files"]
    dettectFile["DeTT&CT file (.yaml)"]
    magmaFile["MaGMa file (.yaml)"]
  end
  subgraph app["frontend/: the app, in your browser"]
    catalog["ATT&CK catalog<br/>(public/)"] --> pages["DeTT&CT, Insights<br/>and MaGMa pages"]
  end
  notebook --> catalog
  converters --> magmaFile
  dettectFile -- Load --> pages
  magmaFile <-- Load / Save --> pages
```

- **The ATT&CK catalog** is built once per ATT&CK version and is part of the repository. The app loads it when it starts.
- **Your own data**, a DeTT&CT file and MaGMa use cases, is loaded with the buttons on the pages. MaGMa work is kept by saving it as a file (**Save MaGMa YAML**); the browser stores nothing.

## The app (`frontend/src/`)

Each layer has one job:

| Layer | Folder | Job |
|---|---|---|
| Pages | `views/` | The three pages, each built from components |
| Components | `components/` | What you see and click, grouped by page (`attack/`, `insights/`, `magma/`), plus shared ones (`common/`) |
| Shared data | `stores/` | The data all pages use: the catalog and the DeTT&CT visibility (`tactics.ts`), and the MaGMa use cases (`magma.ts`) |
| Calculations | `domain/` | Visibility, scores, risk and checks, without user interface, each with tests |
| Files | `io/` | Reading and writing files: the catalog, DeTT&CT and MaGMa files, downloads |

`App.vue` is the frame around the pages (navigation and domain buttons) and loads the catalog; `router/` connects the addresses to the pages. How to run, test and build the app is in [`frontend/README.md`](../frontend/README.md).

Three agreements keep it this way:

- Calculations and checks go in `domain/`, with a test in the `__tests__/` folder next to them.
- Reading and writing files goes in `io/`. Stores never show messages; components do.
- Every folder has a README with a table of its files. Update it when you add, remove or rename a file.

**Example: loading a MaGMa file.** The **Load MaGMa YAML** button (`SheetTabs.vue`) reads and checks the file with `io/`, asks before replacing use cases, and hands them to the store (`stores/magma.ts`). The store recalculates everything with `domain/magma/calculations.ts`, and the sheets, heatmap and charts update by themselves.

## The tools (`tools/`)

| Tool | When to use it |
|---|---|
| `build_attack_catalog.ipynb` | For a new ATT&CK version: downloads MITRE's files, and builds, checks and writes the catalog |
| `convert_magma_excel.py` | To turn a filled-in MaGMa template into a MaGMa file for PRISMA |
| `convert_manual_excel.py` | To turn a simple list of detection rules into a MaGMa file for PRISMA |

The setup and commands are in [`tools/README.md`](../tools/README.md).
