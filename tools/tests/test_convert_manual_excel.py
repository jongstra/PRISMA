"""Tests for the converter of a simple list of detection rules (convert_manual_excel.py)."""
import json
from pathlib import Path

import pandas as pd
import pytest
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
    # Without a parent: PRISMA shows the parent cell red, so one can be chosen.
    assert not any('parentIds' in usecase for usecase in usecases)


def test_rows_that_cannot_be_converted_are_listed_and_nothing_is_converted():
    rules = pd.DataFrame([
        {'displayName': 'Fine', 'Implementation': 0.5, 'techniques': "['T1059']"},
        {'displayName': None, 'Implementation': 0.5, 'techniques': "['T1059', 'T1105']"},
        {'displayName': 'Text', 'Implementation': 'abc', 'techniques': None},
        {'displayName': 'Too much', 'Implementation': 1.5, 'techniques': None},
        {'displayName': 'Typo', 'Implementation': 0.5, 'techniques': "['T1059'"},
    ])
    with pytest.raises(ValueError) as error:
        manual_excel.process_data(rules, 'enterprise-attack')
    assert str(error.value) == '\n'.join([
        'Nothing was converted, because of these rows:',
        'row 3: it has no name',
        'row 4: its Implementation "abc" is not a fraction from 0 to 1',
        'row 5: its Implementation "1.5" is not a fraction from 0 to 1',
        """row 6: its techniques "['T1059'" are not a list such as ['T1059', 'T1105']""",
    ])


def test_an_empty_implementation_stays_empty(tmp_path):
    rules = pd.DataFrame([{'displayName': 'Rule A', 'Implementation': None, 'techniques': None}])
    usecases = manual_excel.process_data(rules, 'enterprise-attack')
    assert 'implementation' not in usecases[0]  # PRISMA counts it as 0%, and shows it empty


def test_a_date_as_implementation_and_too_many_techniques_are_listed_too():
    rules = pd.DataFrame([
        {'displayName': 'Date', 'Implementation': pd.Timestamp('2026-11-20'), 'techniques': None},
        {'displayName': 'Many', 'Implementation': 0.5, 'techniques': str([f'T{1000 + n}' for n in range(27)])},
    ])
    with pytest.raises(ValueError) as error:
        manual_excel.process_data(rules, 'enterprise-attack')
    assert str(error.value) == '\n'.join([
        'Nothing was converted, because of these rows:',
        'row 2: its Implementation "2026-11-20 00:00:00" is not a fraction from 0 to 1',
        'row 3: it has more than 26 techniques',
    ])


def test_a_list_without_a_needed_column_is_refused():
    rules = pd.DataFrame([{'displayName': 'Rule A', 'Implementation': 0.5}])
    with pytest.raises(ValueError) as error:
        manual_excel.process_data(rules, 'enterprise-attack')
    assert str(error.value) == ('Nothing was converted: the list has no column techniques; '
                                'it needs the columns displayName, Implementation and techniques.')


def test_the_example_file_converts(tmp_path):
    output = tmp_path / 'manual_export.yaml'
    manual_excel.convert(ROOT / 'examples' / 'magma' / 'manual_export.xlsx', output)
    usecases = yaml.safe_load(output.read_text())
    assert len(usecases) == 42
    assert {usecase['domain'] for usecase in usecases} == {'enterprise-attack'}
    # Every technique is in the Enterprise catalog, so the example loads without a failed import.
    catalog = json.loads((ROOT / 'frontend' / 'public' / 'tactics_and_techniques_by_domain.json').read_text())
    known = {technique['external_id'] for tactic in catalog['enterprise']['tactics'] for technique in tactic['techniques']}
    known |= {sub['external_id'] for tactic in catalog['enterprise']['tactics'] for technique in tactic['techniques']
              for sub in technique.get('sub_techniques', [])}
    assert {usecase['attackTechniqueId'] for usecase in usecases} - known - {''} == set()
