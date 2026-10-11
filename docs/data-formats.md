# PRISMA's files

The files you load into PRISMA, and what PRISMA does with them. Examples are in [`examples/`](../examples/) and [`templates/`](../templates/).

| File | Made by | Loaded with |
|---|---|---|
| [DeTT&CT file](#the-dettct-file) (YAML) | The DeTT&CT editor | **Load DeTT&CT Data Sources YAML**, on the DeTT&CT page |
| [MaGMa file](#the-magma-file) (YAML) | **Save MaGMa YAML** on the MaGMa page, or the Excel converters | **Load MaGMa YAML**, on the MaGMa page |
| [Excel files](#excel-files) | You: the MaGMa template, or a list of rules | `tools/convert_magma_excel.py` or `tools/convert_manual_excel.py`, which turn them into a MaGMa file |

The ATT&CK catalog, which the app loads by itself, is made by `tools/build_attack_catalog.ipynb` (see [architecture.md](architecture.md)).

## The DeTT&CT file

A data source administration file from [DeTT&CT](https://github.com/rabobank-cdc/DeTTECT). PRISMA reads only this:

```yaml
file_type: data-source-administration   # required: other DeTT&CT files are refused
domain: enterprise-attack               # enterprise-attack, mobile-attack or ics-attack
data_sources:
  - data_source_name: Process Creation  # an ATT&CK data component; each name once
    data_source:
      - data_quality:
          device_completeness: 4        # 0 to 5; empty counts as 0
```

- Only the **first** entry under `data_source` counts, and only its **device completeness** (see [calculations.md](calculations.md)).
- Data sources that ATT&CK does not know are ignored and listed in a message.
- A file with a problem is refused as a whole, and the visibility you had stays: for example the wrong file type or domain, a data source that appears twice or has no name or data quality, or a device completeness outside 0 to 5.

## The MaGMa file

A YAML list of use cases. **Save MaGMa YAML** writes all domains. **Load MaGMa YAML** replaces the use cases of the domains in the file, and keeps the other domains.

```yaml
- domain: enterprise-attack
  level: 1
  id: DOS
  name: Denial of service
  inImpact: 5
  thrImpact: 0
  outImpact: 95
- domain: enterprise-attack
  level: 2
  id: DOS-1
  name: DDoS detection
  parentIds: [DOS]
- domain: enterprise-attack
  level: 3
  id: DOS-1-1
  name: High traffic volume
  parentIds: [DOS-1]
  attackTechniqueId: T1498
  dataSource: Firewall
  implementation: 90
  effectiveness: 50
```

| Field | Levels | Meaning |
|---|---|---|
| `domain` | All | `enterprise-attack`, `mobile-attack` or `ics-attack` (required) |
| `level` | All | 1, 2 or 3 (required) |
| `id` | All | Unique within the domain (required) |
| `name`, `description` | All | Text |
| `parentIds` | 2, 3 | The ID of the use case one level up, as a list. No parent: leave it out, or `[none]` |
| `inImpact`, `thrImpact`, `outImpact` | 1 | The share of an attack in the IN, THROUGH and OUT phase: 0 to 100, together 100 |
| `attackTechniqueId` | 3 | A technique or sub-technique ID of the domain, or `none` |
| `dataSource` | 3 | Text, such as a log source |
| `visibility`, `implementation`, `effectiveness` | 3 | 0 to 100 |
| `visibilityFromAttackTechniqueOverride` | 3 | For a use case with a technique: `false` (default) takes the visibility from the technique's DeTT&CT visibility, `true` uses `visibility` from the file. Without a technique, `visibility` from the file is always used |

**When loading:**

- First, the whole file is checked: it must be valid YAML, a list of use cases, and contain use cases for at least one supported domain. Otherwise nothing changes.
- A use case with a problem is skipped and listed in the summary: for example a missing or duplicate ID, an unknown domain, level or technique, a percentage that is not a number from 0 to 100, or a use case that is its own (indirect) parent.
- A parent ID that does not exist, or more than one parent, is loaded with a warning.
- The permanent IN and THR use cases are skipped: PRISMA always has them.
- PRISMA calculates the scores of L1 and L2, the `weight` and the risk itself. **Save MaGMa YAML** also writes those (and `impact`, the same as `weight`), for information only.
- An empty percentage counts as 0%. A `.nan` from an older version of PRISMA counts as empty.

## Excel files

**The MaGMa template** ([`templates/`](../templates/)) is converted by `tools/convert_magma_excel.py`, which reads three sheets:

| Sheet | Columns |
|---|---|
| L1 UC | L1 Use Case Identifier, Use Case Name, Description, Cumulative IN weight, Cumulative THROUGH weight, OUT weight |
| L2 UC | L2 Use Case Identifier, Use Case Name, Use Case Description, L1 Use Case Identifier |
| L3 UC | Rule Identifier, Technical Use Case Name, Use Case Description, L2 Use Case Identifier, ATT&CK techniques, Log source type, Visibility %, Implementation %, Effectiveness % |

- Fractions (0.95) become percentages (95). An L3 rule with a visibility other than 0 gets `visibilityFromAttackTechniqueOverride: true`.
- A rule with several techniques ("T1059, T1105") becomes one use case per technique, with A, B, … added to its ID and name.
- Empty rows, the template's example row (text in square brackets) and the IN and THR rows of the L1 sheet are skipped. An L2 or L3 row without an ID, or with an Excel error such as `#N/A`, stops the conversion, with a list of those rows.

**A list of detection rules** is converted by `tools/convert_manual_excel.py`: a CSV file (separated by `;`) or an Excel file with the columns `displayName`, `Implementation` (a fraction) and `techniques` (a list, such as `['T1059', 'T1105']`). Each rule becomes an L3 use case without a parent, with the IDs UC1, UC2, …, split per technique as above.
