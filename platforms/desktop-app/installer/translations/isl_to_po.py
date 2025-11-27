import argparse
import configparser
import os
import sys
from datetime import datetime
from pathlib import Path

import polib
from definitions import LANG_DEFINITIONS


def resolve_input_file(locale_code, inno_dir, direct_input):
    """
    Determines the path to the translation file (e.g., es_ES.isl).
    Returns None if generating the source (en) or if file not found.
    """
    # Case 1: Direct file path provided
    if direct_input:
        return direct_input

    # Case 2: Auto-lookup based on directory and definitions
    if inno_dir and locale_code in LANG_DEFINITIONS:
        inno_name = LANG_DEFINITIONS[locale_code]["inno_name"]
        candidate = Path(inno_dir) / f"{inno_name}.isl"
        if candidate.exists():
            print(f"  -> Found standard Inno Setup translations: {candidate}")
            return str(candidate)
        else:
            print(
                f"  -> Warning: Standard file '{inno_name}.isl' not found in {inno_dir}."
            )

    return None


def main(
    template_path,
    output_path,
    locale_code,
    input_path=None,
    inno_dir=None,
    no_overwrite=False,
):
    encoding = "utf-8-sig"

    if no_overwrite and os.path.exists(output_path):
        print(f"Error: The file '{output_path}' already exists.")
        print("Aborting to prevent overwriting existing translations.")
        sys.exit(1)

    # Resolve the secondary file (Translations)
    translated_file_path = resolve_input_file(locale_code, inno_dir, input_path)

    # Read English Template (Keys)
    template_config = configparser.ConfigParser(interpolation=None)
    template_config.optionxform = str
    template_config.read(template_path, encoding=encoding)

    # Read Translated File (Values) - if it exists
    translated_config = configparser.ConfigParser(interpolation=None)
    translated_config.optionxform = str

    has_translation = False
    if translated_file_path and os.path.exists(translated_file_path):
        translated_config.read(translated_file_path, encoding=encoding)
        has_translation = True

    # Create PO Object
    po = polib.POFile()
    now_iso = datetime.now().astimezone().isoformat()
    po.metadata = {
        "Project-Id-Version": "kolibri-windows-installer",
        "POT-Creation-Date": now_iso,
        "PO-Revision-Date": now_iso,
        "Language": locale_code,
        "Content-Type": "text/plain; charset=utf-8",
    }

    # Merge Logic
    print(f"  -> Generating PO file for '{locale_code}'...")

    for section in template_config.sections():
        # Filter out technical sections
        if section in ["LangOptions", "Setup"]:
            continue

        for key in template_config[section]:
            if not key:
                continue

            msgid = template_config[section][key]
            msgstr = ""

            # Only fill msgstr if we are NOT in English AND we have a translation file
            if locale_code != "en" and has_translation:
                if translated_config.has_section(section):
                    msgstr = translated_config.get(section, key, fallback="")

            entry = polib.POEntry(
                msgid=msgid, msgstr=msgstr, msgctxt=f"[{section}]{key}"
            )
            po.append(entry)

    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    po.save(output_path)
    print(f"  -> Success! Created: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate PO files from Inno Setup ISL files."
    )

    # Required
    parser.add_argument("-t", "--template", required=True, help="Path to en.isl")
    parser.add_argument("-o", "--output", required=True, help="Path to output .po file")
    parser.add_argument("-l", "--lang", required=True, help="Locale code (e.g. es_ES)")

    # Optional (Choose one or the other or neither)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("-i", "--input", help="Direct path to a translated ISL file")
    group.add_argument(
        "--inno-dir", help="Directory of Inno Setup Languages to auto-lookup files"
    )

    parser.add_argument(
        "--no-overwrite", action="store_true", help="Prevent overwriting existing files"
    )

    args = parser.parse_args()

    main(
        args.template,
        args.output,
        args.lang,
        args.input,
        args.inno_dir,
        args.no_overwrite,
    )
