# Tools

Python tools that prepare data for PRISMA: a notebook that builds the ATT&CK catalog, and scripts that convert Excel files to MaGMa YAML.

| Name | Description |
|---|---|
| [`dettect_files/`](dettect_files/) | Extra DeTT&CT data sources per technique, used for the catalog |
| [`mitre_attack_files/`](mitre_attack_files/) | ATT&CK v17.1 source data from MITRE |
| [`tests/`](tests/) | Tests for the converters and the catalog |
| [`build_attack_catalog.ipynb`](build_attack_catalog.ipynb) | Builds the ATT&CK catalog the app loads (`frontend/public/`) |
| [`common.py`](common.py) | Helpers that both converters use |
| [`convert_magma_excel.py`](convert_magma_excel.py) | Converts a filled-in [MaGMa template](../templates/) to MaGMa YAML |
| [`convert_manual_excel.py`](convert_manual_excel.py) | Converts a simple list of detection rules to MaGMa YAML |
| [`pytest.ini`](pytest.ini) | Settings for the tests |
| [`requirements.txt`](requirements.txt) | Python packages the tools need, with their versions |

## Setup

```sh
cd tools
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Use

Convert Excel files from the repository folder (add `--domain mobile-attack` or `--domain ics-attack` for another domain; the default is `enterprise-attack`):

```sh
tools/.venv/bin/python tools/convert_magma_excel.py my_magma.xlsx my_magma.yaml
tools/.venv/bin/python tools/convert_manual_excel.py rules.xlsx rules.yaml
```

Build the catalog in Jupyter: start it with `tools/.venv/bin/jupyter notebook tools`, open `build_attack_catalog.ipynb` and run all cells. The notebook checks the catalog before writing it.

Run the tests with `tools/.venv/bin/python -m pytest tools`.

## New ATT&CK version

Download the new files from [MITRE's ATT&CK STIX data](https://github.com/mitre-attack/attack-stix-data) into `mitre_attack_files/`, set `ATTACK_VERSION` in `build_attack_catalog.ipynb`, and run it. Then refresh the template's technique list (see [`templates/`](../templates/)).
