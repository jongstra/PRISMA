"""Tests for the ATT&CK catalog that build_attack_catalog.ipynb writes for the app."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'frontend' / 'public' / 'tactics_and_techniques_by_domain.json'


def test_the_catalog_was_built_from_the_source_files_in_the_repository():
    """Fails when the ATT&CK or DeTT&CT files change without building the catalog again (run build_attack_catalog.ipynb)."""
    meta = json.loads(CATALOG.read_text())['meta']
    sources = [*sorted((ROOT / 'tools' / 'mitre_attack_files').glob('*-attack-*.json')), ROOT / 'tools' / 'dettect_files' / 'dettect_data_sources.json']
    expected = {path.name: 'sha256:' + hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
    assert meta['sources'] == expected
    assert all(f"-attack-{meta['attack_version']}.json" in name for name in expected if 'attack' in name)
