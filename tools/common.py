"""Helpers that both Excel converters use (convert_magma_excel.py and convert_manual_excel.py)."""
import yaml


# Helper function to map numbers to letters of the alphabet.
def int_to_letter(n):
    if n < 0 or n > 25:
        raise ValueError("Input must be an integer between 0 and 25 inclusive.")
    return chr(n + ord('a'))


def save_to_yaml(yaml_entries, output_file):
    """
    Save the processed data to a YAML file.

    Args:
        yaml_entries (list): The list of dictionaries representing the YAML entries.
        output_file (str): The path to the output YAML file.
    """
    with open(output_file, 'w') as yaml_file:
        yaml.dump(yaml_entries, yaml_file, default_flow_style=False)
