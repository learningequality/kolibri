"""
Create New Inno Setup Language File (`.isl`).

This script automates the creation of a new language file for the Kolibri
Windows installer. It's reusing existing translations from the standard
Inno Setup language packs, when they are available.

Workflow:
1.  Takes a language name (e.g., "French") as an argument.
2.  Checks for a corresponding standard language file (e.g., "French.isl")
    in the specified Inno Setup installation directory.
3.  If a standard file is found, it merges the pre-translated `[Messages]`
    section from that file with the project-specific `[CustomMessages]`
    from the local `English.isl` template.
4.  If no standard file is found, it falls back to creating a direct copy of
    the `English.isl` template.
5.  The final output is a new `.isl` file in the `translations` directory,
    ready to be translated and enabled in `kolibri.iss`.
"""
import argparse
import configparser
import shutil
from pathlib import Path

SOURCE_TEMPLATE = "English.isl"
TRANSLATIONS_DIR = Path(__file__).parent.resolve()


def _merge_with_standard_isl(standard_path: Path, master_path: Path, dest_path: Path):
    """
    Merges a standard Inno Setup language file with the project's master template.
    """
    print(f"Found standard Inno Setup file: {standard_path}")
    print("Merging standard messages with project's custom messages...")
    try:
        # Load the standard Inno file (pre-translated [Messages])
        final_config = configparser.ConfigParser(
            allow_no_value=True, interpolation=None, strict=False
        )
        final_config.optionxform = str
        final_config.read(standard_path, encoding="utf-8-sig")

        # Load our English template to get the custom messages
        master_config = configparser.ConfigParser(
            allow_no_value=True, interpolation=None, strict=False
        )
        master_config.optionxform = str
        master_config.read(master_path, encoding="utf-8-sig")

        # Add the [CustomMessages] section if it exists in the master
        if "CustomMessages" in master_config:
            final_config["CustomMessages"] = master_config["CustomMessages"]
        else:
            print("Warning: No [CustomMessages] section found in the English template.")
            final_config.add_section("CustomMessages")  # Add an empty section

        # Write the merged result to the new file
        with open(dest_path, "w", encoding="utf-8") as f:
            final_config.write(f, space_around_delimiters=False)

        return "merged"
    except (configparser.Error, UnicodeDecodeError) as e:
        print(f"Config/encoding error: {e}")
        return "error"
    except (OSError,) as e:
        print(f"Filesystem error: {e}")
        return "error"


def _copy_from_english_template(source_path: Path, dest_path: Path):
    """
    Creates a new language file by copying the English template.
    """
    print("Falling back to creating from the English template.")
    try:
        shutil.copy(source_path, dest_path)
        return "copied"
    except (shutil.SameFileError, FileNotFoundError, PermissionError, OSError) as e:
        print(f"Copy error: {e}")
        return "error"


def create_new_language_file(language_name: str, inno_languages_dir: str):
    dest_filename = f"{language_name}.isl"
    dest_path = TRANSLATIONS_DIR / dest_filename
    source_path = TRANSLATIONS_DIR / SOURCE_TEMPLATE

    print(f"Attempting to create new language file: {dest_path}")

    if dest_path.exists():
        print(f"Error: A file for '{language_name}' already exists at {dest_path}")
        print("Aborting to prevent data loss.")
        return

    if not source_path.exists():
        print(f"Error: Master template '{SOURCE_TEMPLATE}' not found.")
        return

    standard_isl_path = None
    if inno_languages_dir:
        standard_isl_path = Path(inno_languages_dir) / dest_filename

    mode = "error"
    if standard_isl_path and standard_isl_path.exists():
        # Case 1: Standard Inno Setup file exists. MERGE IT.
        mode = _merge_with_standard_isl(standard_isl_path, source_path, dest_path)
    else:
        # Case 2: No standard file found. FALL BACK to copying.
        if inno_languages_dir:
            print(f"Info: Standard Inno Setup file not found for '{language_name}'.")
        else:
            print("Info: Inno Setup languages directory not provided.")
        mode = _copy_from_english_template(source_path, dest_path)

    if mode != "error":
        print_success_message(dest_path, mode)


def print_success_message(path, mode):
    print(f"\nSuccess! New language file created: {path}")
    print("\n--- Next Steps ---")
    print(
        r"1. Add the new language to the [Languages] section in 'installer\kolibri.iss'."
    )
    print(
        r'   Example for Spanish, Name: "es"; MessagesFile: "translations\Spanish.isl"'
    )
    if mode == "copied":
        print("2. Configure the [LangOptions] section in the new .isl file")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scaffold a new Inno Setup language file from the English template."
    )
    parser.add_argument(
        "--name",
        required=True,
        help="The name of the new language (e.g., 'French', 'Spanish'). This will be used for the filename.",
    )
    parser.add_argument(
        "--inno-languages-dir",
        help="Optional: Path to the 'Languages' directory of your Inno Setup installation.",
    )
    args = parser.parse_args()

    create_new_language_file(args.name, args.inno_languages_dir)
