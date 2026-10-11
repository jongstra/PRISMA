"""Tests for the ATT&CK catalog that build_attack_catalog.ipynb writes for the app."""
import hashlib
import json
from pathlib import Path

from mitreattack.release_info import STIX21

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'frontend' / 'public' / 'tactics_and_techniques_by_domain.json'
DETTECT_FILE = ROOT / 'tools' / 'dettect_files' / 'dettect_data_sources.json'


def test_the_catalog_was_built_from_mitres_files_and_the_dettect_file_in_the_repository():
    """
    The fingerprints in the catalog's meta block must be MITRE's official ones for its ATT&CK version, and the one of the
    DeTT&CT file in the repository. This fails when the DeTT&CT file changes without building the catalog again.
    """
    meta = json.loads(CATALOG.read_text())['meta']
    version = meta['attack_version']
    expected = {f'{domain}-attack-{version}.json': 'sha256:' + STIX21[domain][version] for domain in ('enterprise', 'ics', 'mobile')}
    expected['dettect_data_sources.json'] = 'sha256:' + hashlib.sha256(DETTECT_FILE.read_bytes()).hexdigest()
    assert meta['sources'] == expected
