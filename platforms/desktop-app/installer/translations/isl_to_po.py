import argparse
import configparser
from datetime import datetime

import polib


def convert_isl_to_po(
    template_isl_path, translated_isl_path, output_po_path, language_code=""
):
    """
    Converts an ISL file to a PO file, using another ISL as a template.
    - template_isl_path (e.g., English.isl): Used for msgid.
    - translated_isl_path (e.g., German.isl): Used for msgstr.
    """
    encoding = "utf-8-sig"

    # Read the English template for msgids
    template_config = configparser.ConfigParser(interpolation=None)
    template_config.optionxform = str
    template_config.read(template_isl_path, encoding=encoding)

    # Read the translated file for msgstrs
    translated_config = configparser.ConfigParser(interpolation=None)
    translated_config.optionxform = str
    translated_config.read(translated_isl_path, encoding=encoding)

    # Create a new PO file object
    po = polib.POFile()

    # Add Metadata to the PO file
    now_iso = datetime.now().astimezone().isoformat()
    po.metadata = {
        "Project-Id-Version": "kolibri-windows-installer",
        "Report-Msgid-Bugs-To": " ",
        "POT-Creation-Date": now_iso,
        "PO-Revision-Date": now_iso,
        "Last-Translator": "FULL NAME <EMAIL@ADDRESS>",
        "Language-Team": " ",
        "Language": language_code,
        "MIME-Version": "1.0",
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Transfer-Encoding": "8bit",
    }

    # Process all sections in the template
    for section in template_config.sections():
        if section not in translated_config:
            continue

        for key in template_config[section]:
            if not key:
                continue

            msgid = template_config[section][key]
            msgstr = translated_config.get(section, key, fallback="")

            entry = polib.POEntry(
                msgid=msgid, msgstr=msgstr, comment=f"[{section}]{key}"
            )
            po.append(entry)

    print(f"Successfully created PO file: {output_po_path}")
    po.save(output_po_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert ISL files to PO format.")
    parser.add_argument(
        "-t",
        "--template",
        required=True,
        help="Path to the template ISL file (e.g., English.isl).",
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        help="Path to the translated ISL file (e.g., German.isl).",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Path for the output PO file (e.g., German.po).",
    )
    parser.add_argument(
        "-l", "--lang", required=True, help="Language code (e.g., 'de_DE', 'bg_BG')."
    )
    args = parser.parse_args()

    convert_isl_to_po(args.template, args.input, args.output, args.lang)
