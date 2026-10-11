"""
Convert a filled-in MaGMa template (see templates/) to a MaGMa YAML file, which you load on PRISMA's MaGMa page:

    tools/.venv/bin/python tools/convert_magma_excel.py my_magma.xlsx my_magma.yaml

Add --domain mobile-attack or --domain ics-attack for another ATT&CK domain (the default is enterprise-attack).
"""
import argparse
import math

import pandas as pd

from common import int_to_letter, save_to_yaml


def load_data(file_path):
    """
    Load data from an XLSX file.
    
    Args:
        file_path (str): The path to the input file.
        
    Returns:
        pd.DataFrame: The loaded data as a DataFrame.
    """
    if str(file_path).endswith('.xlsx') or str(file_path).endswith('.xls'):
        return pd.read_excel(file_path, sheet_name=['L1 UC', 'L2 UC', 'L3 UC'])
    else:
        raise ValueError("Unsupported file format. Please provide a CSV or XLSX file.")


# Helper functions to handle nan values.
def replace_nan_with_zero(value):
    return value if not math.isnan(value) else 0

# Helper function to handle nan values.
def replace_nan_with_empty_string(value):
    return value if not str(value) == 'nan' else ''

# Helper function to read a text cell: an empty cell gives '', and spaces around the text are removed.
def clean_text(value):
    return '' if pd.isnull(value) else str(value).strip()

# Helper function to read a comma-separated list of identifiers, such as "T1059, T1105".
def split_ids(value):
    return [id.strip() for id in clean_text(value).split(',') if id.strip()]

# Helper function to turn a fraction from Excel (0.95) into a percentage (95), or None for an empty cell.
def fraction_to_percentage(value):
    return None if pd.isnull(value) else round(float(value) * 100, 2)

# Error values that an Excel formula can give instead of a value. (pandas already reads #N/A as an empty cell.)
EXCEL_ERRORS = {'#N/A', '#REF!', '#VALUE!', '#NAME?', '#DIV/0!', '#NUM!', '#NULL!'}

# Helper function that describes why a row cannot be converted, or returns None when it can.
def row_problem(id, other_ids):
    if id == '':
        return 'it has no identifier'
    errors = [value for value in [id] + other_ids if value in EXCEL_ERRORS]
    if errors:
        return f'it contains the Excel error {errors[0]}'
    return None

# Helper function to stop the conversion when rows cannot be converted.
def raise_for_problems(sheet_name, problems):
    if problems:
        raise ValueError(f"Nothing was converted, because of these rows in sheet '{sheet_name}':\n" + '\n'.join(problems))


# Process the L1 data to convert it into a list of dictionaries, representing the desired YAML format.
def process_data_L1(df, domain):
    """
    Process the DataFrame to create a list of dictionaries in the desired YAML format.

    Args:
        df (pd.DataFrame): The input DataFrame.
        domain (str): the ATT&CK domain that all use cases are assigned to.

    Returns:
        list: A list of dictionaries representing the YAML usecase entries.
    """

    # The column headers are in the second row of the sheet. Use them as column names, without line breaks and double spaces.
    header_index = df.index[(df == 'L1 Use Case Identifier').any(axis=1)][0]
    df = df.loc[header_index + 1:].set_axis([' '.join(str(header).split()) for header in df.loc[header_index]], axis=1)

    usecases = []

    for index, row in df.iterrows():
        id = clean_text(row['L1 Use Case Identifier'])
        if id in ('IN', 'THR'):  # PRISMA already has the Cumulative IN and THROUGH use cases.
            continue
        if id == '':
            if usecases:  # The list of business risks ends at the first row without an ID.
                break
            continue  # Rows without an ID above the business risks are section headers.

        # Process all rows. Create a usecase for each row.
        usecase = {
            'domain': domain,
            'level': 1,
            'name': clean_text(row['Use Case Name']),
            'id': id,
            'description': replace_nan_with_empty_string(row['Description']),
        }

        # Add the IN/THROUGH/OUT weights as impacts (in %). Empty weights stay empty: not every organisation uses every business risk.
        for key, column in [('inImpact', 'Cumulative IN weight'), ('thrImpact', 'Cumulative THROUGH weight'), ('outImpact', 'OUT weight')]:
            impact = fraction_to_percentage(row[column])
            if impact is not None:
                usecase[key] = impact

        usecases.append(usecase)

    return usecases


# Process the L2 data to convert it into a list of dictionaries, representing the desired YAML format.
def process_data_L2(df, domain):
    """
    Process the DataFrame to create a list of dictionaries in the desired YAML format.

    Args:
        df (pd.DataFrame): The input DataFrame.
        domain (str): the ATT&CK domain that all use cases are assigned to.

    Returns:
        list: A list of dictionaries representing the YAML usecase entries.
    """

    usecases = []
    problems = []

    for index, row in df.iterrows():
        name = clean_text(row['Use Case Name'])
        id = clean_text(row['L2 Use Case Identifier'])
        description = replace_nan_with_empty_string(row['Use Case Description'])
        parents = split_ids(row['L1 Use Case Identifier'])

        # Skip empty rows, and collect the rows that cannot be converted (index + 2 is the row number in Excel).
        if id == '' and name == '':
            continue
        problem = row_problem(id, parents)
        if problem:
            problems.append(f'row {index + 2}: {problem}')
            continue

        # Process all rows. Create a usecase for each row.
        usecase = {
            'domain': domain,
            'level': 2,
            'name': name,
            'id': id,
            'description': description,
            'parentIds': parents,
        }

        usecases.append(usecase)

    raise_for_problems('L2 UC', problems)
    return usecases


# Process the L3 data to convert it into a list of dictionaries, representing the desired YAML format.
def process_data_L3(df, domain):
    """
    Process the DataFrame to create a list of dictionaries in the desired YAML format.

    Args:
        df (pd.DataFrame): The input DataFrame.
        domain (str): the ATT&CK domain that all use cases are assigned to.

    Returns:
        list: A list of dictionaries representing the YAML usecase entries.
    """

    usecases = []
    problems = []

    for index, row in df.iterrows():
        name_base = clean_text(row['Technical Use Case Name'])
        id_base = clean_text(row['Rule Identifier'])
        description = replace_nan_with_empty_string(row['Use Case Description'])
        implementation = round(replace_nan_with_zero(row['Implementation %']) * 100, 2)
        effectiveness = round(replace_nan_with_zero(row['Effectiveness %']) * 100, 2)
        visibility = round(replace_nan_with_zero(row['Visibility %']) * 100, 2)
        override = visibility != 0  # Set override to True when visibility is not 0 (otherwise set to False).
        parents = split_ids(row['L2 Use Case Identifier'])
        techniques = split_ids(row['ATT&CK techniques'])
        data_source = clean_text(row.get('Log source type'))

        # Skip empty rows and the template's placeholder row (text in square brackets, such as "[ADD NAME HERE]"),
        # and collect the rows that cannot be converted (index + 2 is the row number in Excel).
        if id_base == '' and name_base == '' and not techniques:
            continue
        if name_base.startswith('[') and name_base.endswith(']'):
            continue
        problem = row_problem(id_base, parents + techniques)
        if problem:
            problems.append(f'row {index + 2}: {problem}')
            continue

        # A use case without a technique gets the technique 'none', like a new L3 use case in PRISMA.
        if not techniques:
            techniques = ['none']

        # Process all rows. Create a usecase for each row, or multiple usecases when multiple techniques are present.
        usecase_has_multiple_techniques = len(techniques) > 1
        for i, technique in enumerate(techniques):

            # Create a name and id for the use case, based on whether the use case has multiple techniques and has to be split up.
            if usecase_has_multiple_techniques:
                name = name_base + ' - ' + int_to_letter(i).upper()
                id = id_base + int_to_letter(i).upper()
            else:
                name = name_base
                id = id_base

            usecase = {
                'domain': domain,
                'level': 3,
                'name': name,
                'id': id,
                'description': description,
                'parentIds': parents,
                'visibility': visibility,
                'implementation': implementation,
                'effectiveness': effectiveness,
                'weight': 0,
                'impact': 0,
                'attackTechniqueId': technique,
                'visibilityFromAttackTechniqueOverride': override
            }

            # Add the log source type as the data source of the use case.
            if data_source:
                usecase['dataSource'] = data_source

            usecases.append(usecase)

    raise_for_problems('L3 UC', problems)
    return usecases


def convert(input_file, output_file, domain='enterprise-attack'):
    """
    Convert a filled-in MaGMa template to a MaGMa YAML file that PRISMA can load.
    
    Args:
        input_file (str): The path to the input XLSX file.
        output_file (str): The path to the output YAML file.
        domain (str): The ATT&CK domain that all use cases are assigned to.
    """
    # Load data from the input file.
    df = load_data(input_file)
    
    # Process the DataFrame to create a list of dictionaries, representing the usecases.
    L1_usecases = process_data_L1(df['L1 UC'], domain)
    L2_usecases = process_data_L2(df['L2 UC'], domain)
    L3_usecases = process_data_L3(df['L3 UC'], domain)
    
    # Save the YAML entries to a file.
    save_to_yaml(L1_usecases + L2_usecases + L3_usecases, output_file)
    
    print(f"Data successfully converted and saved to {output_file}: {len(L1_usecases)} L1, {len(L2_usecases)} L2 and {len(L3_usecases)} L3 use cases.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert a filled-in MaGMa template to MaGMa YAML.')
    parser.add_argument('input_file', help='the filled-in MaGMa template (.xlsx)')
    parser.add_argument('output_file', help='the MaGMa YAML file to write')
    parser.add_argument('--domain', default='enterprise-attack', choices=['enterprise-attack', 'mobile-attack', 'ics-attack'],
                        help='the ATT&CK domain of the use cases (default: enterprise-attack)')
    arguments = parser.parse_args()
    convert(arguments.input_file, arguments.output_file, arguments.domain)
