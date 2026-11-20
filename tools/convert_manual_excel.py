"""
Convert a simple list of detection rules (CSV or XLSX, with the columns displayName, Implementation and techniques) to
a MaGMa YAML file with one L3 use case per rule and technique, which you load on PRISMA's MaGMa page:

    tools/.venv/bin/python tools/convert_manual_excel.py rules.xlsx rules.yaml

Add --domain mobile-attack or --domain ics-attack for another ATT&CK domain (the default is enterprise-attack).
"""
import argparse
import ast
import sys

import pandas as pd

from common import int_to_letter, save_to_yaml


def load_data(file_path):
    """
    Load data from a CSV or XLSX file.
    
    Args:
        file_path (str): The path to the input file.
        
    Returns:
        pd.DataFrame: The loaded data as a DataFrame.
    """
    file_path = str(file_path)
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path, sep=';', engine='python')
    elif file_path.endswith('.xlsx') or file_path.endswith('.xls'):
        return pd.read_excel(file_path)
    else:
        raise ValueError("Unsupported file format. Please provide a CSV or XLSX file.")


def read_implementation(value):
    """
    Read the Implementation of a rule: a fraction from 0 to 1, as a percentage (0.95 gives 95), or None when it is empty
    (PRISMA counts it as 0%). Returns the percentage and why it cannot be read, or None when it can.
    """
    if pd.isnull(value):
        return None, None
    try:
        fraction = float(value)
    except (TypeError, ValueError):  # text, or a date
        fraction = None
    if fraction is None or not 0 <= fraction <= 1:
        return None, f'its Implementation "{value}" is not a fraction from 0 to 1'
    return round(fraction * 100, 2), None


def read_techniques(value):
    """
    Read the techniques of a rule: a list such as ['T1059', 'T1105'], or empty. Returns the list and why it cannot be
    read, or None when it can.
    """
    if pd.isnull(value):
        return [], None
    try:
        techniques = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        techniques = None
    if not isinstance(techniques, list) or not all(isinstance(technique, str) for technique in techniques):
        return [], f"its techniques \"{value}\" are not a list such as ['T1059', 'T1105']"
    return techniques, None


def process_data(df, domain):
    """
    Process the DataFrame to create a list of dictionaries in the desired YAML format. When rows cannot be converted
    (no name, an Implementation that is not a fraction, techniques that are not a list), nothing is converted and the
    error lists those rows, as convert_magma_excel.py does.
    
    Args:
        df (pd.DataFrame): The input DataFrame.
        domain (str): the ATT&CK domain that all use cases are assigned to.
        
    Returns:
        list: A list of dictionaries representing the YAML usecase entries.
    """

    usecases = []
    problems = []
    needed = ['displayName', 'Implementation', 'techniques']
    missing = [column for column in needed if column not in df.columns]
    if missing:
        raise ValueError(f"Nothing was converted: the list has no column {', '.join(missing)}; "
                         f"it needs the columns {', '.join(needed[:-1])} and {needed[-1]}.")

    for index, row in df.iterrows():
        name_base = '' if pd.isnull(row.displayName) else str(row.displayName).strip()
        id_base = f"UC{index + 1}"
        implementation, implementation_problem = read_implementation(row.Implementation)
        techniques, techniques_problem = read_techniques(row.techniques)
        too_many = len(techniques) > 26  # the use cases of a rule get the letters A to Z
        problem = ('it has no name' if name_base == '' else implementation_problem or techniques_problem
                   or ('it has more than 26 techniques' if too_many else None))
        if problem:
            problems.append(f'row {index + 2}: {problem}')
            continue

        # A rule without techniques gets an empty technique, so it still becomes a use case.
        if techniques == []:
            techniques = ['']

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
                'visibility': 0,
                'effectiveness': 0,
                'weight': 0,
                'impact': 0,
                'attackTechniqueId': technique,
                'visibilityFromAttackTechniqueOverride': False
            }
            if implementation is not None:
                usecase['implementation'] = implementation

            usecases.append(usecase)

    if problems:
        raise ValueError('Nothing was converted, because of these rows:\n' + '\n'.join(problems))
    return usecases


def convert(input_file, output_file, domain='enterprise-attack'):
    """
    Convert a list of detection rules (CSV or XLSX) to a MaGMa YAML file with L3 use cases.
    
    Args:
        input_file (str): The path to the input CSV or XLSX file.
        output_file (str): The path to the output YAML file.
        domain (str): The ATT&CK domain that all use cases are assigned to.
    """
    # Load data from the input file.
    df = load_data(input_file)
    
    # Process the DataFrame to create a list of dictionaries, representing the YAML usecase entries.
    yaml_entries = process_data(df, domain)
    
    # Save the YAML entries to a file.
    save_to_yaml(yaml_entries, output_file)
    
    print(f"Data successfully converted and saved to {output_file}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert a list of detection rules to MaGMa YAML.')
    parser.add_argument('input_file', help='the list of detection rules (.csv or .xlsx)')
    parser.add_argument('output_file', help='the MaGMa YAML file to write')
    parser.add_argument('--domain', default='enterprise-attack', choices=['enterprise-attack', 'mobile-attack', 'ics-attack'],
                        help='the ATT&CK domain of the use cases (default: enterprise-attack)')
    arguments = parser.parse_args()
    try:
        convert(arguments.input_file, arguments.output_file, arguments.domain)
    except ValueError as error:
        sys.exit(str(error))  # the rows that cannot be converted, without a Python traceback
