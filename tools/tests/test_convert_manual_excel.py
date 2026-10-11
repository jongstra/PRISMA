"""Tests for the converter of a simple list of detection rules (convert_manual_excel.py)."""
from pathlib import Path

import pandas as pd
import yaml

import convert_manual_excel as manual_excel

ROOT = Path(__file__).resolve().parents[2]


def test_one_L3_use_case_per_rule_and_technique():
    rules = pd.DataFrame([
        {'displayName': 'Rule A', 'Implementation': 0.5, 'techniques': "['T1059', 'T1105']"},
        {'displayName': 'Rule B', 'Implementation': 1, 'techniques': None},
    ])
    usecases = manual_excel.process_data(rules, 'enterprise-attack')
    assert [(u['id'], u['name'], u['attackTechniqueId'], u['implementation'], u['level']) for u in usecases] == [
        ('UC1A', 'Rule A - A', 'T1059', 50, 3),
        ('UC1B', 'Rule A - B', 'T1105', 50, 3),
        ('UC2', 'Rule B', '', 100, 3),
    ]


def test_the_example_file_converts(tmp_path):
    output = tmp_path / 'manual_export.yaml'
    manual_excel.convert(ROOT / 'examples' / 'magma' / 'manual_export.xlsx', output)
    usecases = yaml.safe_load(output.read_text())
    assert len(usecases) == 42
    assert {usecase['domain'] for usecase in usecases} == {'enterprise-attack'}
