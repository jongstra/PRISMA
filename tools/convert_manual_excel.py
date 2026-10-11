"""
Convert a simple list of detection rules (CSV or XLSX, with the columns displayName, Implementation and techniques) to
a MaGMa YAML file with one L3 use case per rule and technique, which you load on PRISMA's MaGMa page:

    tools/.venv/bin/python tools/convert_manual_excel.py rules.xlsx rules.yaml

Add --domain mobile-attack or --domain ics-attack for another ATT&CK domain (the default is enterprise-attack).
"""
import argparse
import ast

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


def process_data(df, domain):
    """
    Process the DataFrame to create a list of dictionaries in the desired YAML format.
    
    Args:
        df (pd.DataFrame): The input DataFrame.
        domain (str): the ATT&CK domain that all use cases are assigned to.
        
    Returns:
        list: A list of dictionaries representing the YAML usecase entries.
    """

    usecases = []

    for index, row in df.iterrows():
        name_base = row.displayName
        id_base = f"UC{index + 1}"
        implementation = round(row.Implementation * 100, 2)
        techniques = row.techniques

        # Pre-process techniques data:
        # Change nan entries to empty lists.
        if pd.isnull(techniques):
            techniques = []
        else:
            # Interpret other entries as Python lists.
            techniques = ast.literal_eval(techniques)

        # Fill all empty lists with an emptry string, so they contain an item.
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
                'parentIds': "",
                'visibility': 0,
                'implementation': implementation,
                'effectiveness': 0,
                'weight': 0,
                'impact': 0,
                'attackTechniqueId': technique,
                'visibilityFromAttackTechniqueOverride': False
            }

            usecases.append(usecase)

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
    convert(arguments.input_file, arguments.output_file, arguments.domain)
