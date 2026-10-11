"""Tests for the MaGMa Excel converter (convert_magma_excel.py), with the MaGMa template from templates/."""
from pathlib import Path

import pandas as pd
import pytest

import convert_magma_excel as magma_excel

ROOT = Path(__file__).resolve().parents[2]

TEMPLATE = ROOT / 'templates' / 'magma_template.xlsx'
DOMAIN = 'enterprise-attack'


@pytest.fixture(scope='module')
def sheets():
    return magma_excel.load_data(TEMPLATE)


def test_the_template_gives_the_example_file(tmp_path):
    output = tmp_path / 'template.yaml'
    magma_excel.convert(TEMPLATE, output, DOMAIN)
    assert output.read_text() == (ROOT / 'examples' / 'magma' / 'template.yaml').read_text()


def test_all_business_risks_are_converted_with_their_weights(sheets):
    # The template is empty apart from the MaGMa framework, so add weights for DOS to a copy of the L1 sheet.
    L1_sheet = sheets['L1 UC'].copy()
    header = L1_sheet.loc[L1_sheet.eq('L1 Use Case Identifier').any(axis=1)].iloc[0]
    column = {' '.join(str(value).split()): name for name, value in header.items()}
    weights = [column['Cumulative IN weight'], column['Cumulative THROUGH weight'], column['OUT weight']]
    L1_sheet[weights] = L1_sheet[weights].astype(object)
    L1_sheet.loc[L1_sheet[column['L1 Use Case Identifier']] == 'DOS', weights] = [0.05, 0, 0.95]

    # Not the fixed IN and THR use cases, which PRISMA already has.
    L1_usecases = {usecase['id']: usecase for usecase in magma_excel.process_data_L1(L1_sheet, DOMAIN)}
    assert list(L1_usecases) == ['FIN', 'DOS', 'ESP', 'CEO', 'EXT', 'SAB', 'INS', 'POL']
    assert [L1_usecases['DOS'].get(key) for key in ('inImpact', 'thrImpact', 'outImpact')] == [5, 0, 95]
    assert 'inImpact' not in L1_usecases['FIN']  # FIN has no weights, so its impacts stay empty.


def test_L2_use_cases_with_spaces_around_the_parent_id(sheets):
    extra_row = pd.DataFrame([{'L2 Use Case Identifier': 'CHECK-L2', 'Use Case Name': 'Spaces', 'L1 Use Case Identifier': ' ESP '}])
    L2_usecases = {usecase['id']: usecase for usecase in magma_excel.process_data_L2(pd.concat([sheets['L2 UC'], extra_row], ignore_index=True), DOMAIN)}
    assert len(L2_usecases) == 38 + 1
    assert L2_usecases['CHECK-L2']['parentIds'] == ['ESP']


def test_L3_rows_that_are_easy_to_get_wrong(sheets):
    # No technique, two techniques with spaces after the comma, the template's placeholder row, and an empty row.
    extra_rows = pd.DataFrame([
        {'Rule Identifier': ' CHECK-1 ', 'Technical Use Case Name': 'No technique', 'L2 Use Case Identifier': 'THR-DIS', 'Log source type': ' Firewall '},
        {'Rule Identifier': 'CHECK-2', 'Technical Use Case Name': 'Two techniques', 'L2 Use Case Identifier': ' THR-EXE ', 'ATT&CK techniques': 'T1059, T1105'},
        {'Technical Use Case Name': '[ADD NAME HERE]', 'Use Case Description': '[ADD DESCRIPTION HERE]', 'ATT&CK techniques': '[ADD TECHNIQUE HERE]'},
        {},
    ])
    L3_usecases = {usecase['id']: usecase for usecase in magma_excel.process_data_L3(pd.concat([sheets['L3 UC'], extra_rows], ignore_index=True), DOMAIN)}
    assert len(L3_usecases) == 3  # the template has no L3 use cases
    assert (L3_usecases['CHECK-1']['attackTechniqueId'], L3_usecases['CHECK-1']['dataSource']) == ('none', 'Firewall')
    split = [(L3_usecases[id]['attackTechniqueId'], L3_usecases[id]['parentIds']) for id in ('CHECK-2A', 'CHECK-2B')]
    assert split == [('T1059', ['THR-EXE']), ('T1105', ['THR-EXE'])]


def test_an_L3_row_without_an_identifier_stops_the_conversion(sheets):
    # For example because the formula for the identifier gives an error.
    row = pd.DataFrame([{'Technical Use Case Name': 'Without ID', 'ATT&CK techniques': 'T1059'}], columns=sheets['L3 UC'].columns)
    with pytest.raises(ValueError, match='row 2: it has no identifier'):
        magma_excel.process_data_L3(row, DOMAIN)
