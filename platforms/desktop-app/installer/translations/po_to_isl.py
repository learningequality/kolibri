import argparse
import configparser

import polib


def convert_po_to_isl(template_isl_path, translated_po_path, output_isl_path):
    encoding = "utf-8-sig"

    # 1. Load the translated .po file
    po = polib.pofile(translated_po_path, encoding="utf-8")

    # 2. Create a lookup map from msgid (English) to msgstr (Translated)
    translation_map = {
        entry.msgid: entry.msgstr for entry in po if entry.msgstr and entry.msgid
    }

    # 3. Load the template .isl file to get the structure and keys
    template_config = configparser.ConfigParser(interpolation=None)
    template_config.optionxform = str
    template_config.read(template_isl_path, encoding=encoding)

    # 4. Iterate through the template and replace values with translations
    for section in template_config.sections():
        for key in template_config[section]:
            english_string = template_config[section][key]

            translated_string = translation_map.get(english_string)

            # If a translation exists, update the value in our config object
            if translated_string:
                template_config.set(section, key, translated_string)

    print(f"Successfully created ISL file: {output_isl_path}")
    with open(output_isl_path, "w", encoding="utf-8-sig") as f:
        template_config.write(f, space_around_delimiters=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PO files back to ISL format.")
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
        help="Path to the translated PO file (e.g., German.po).",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Path for the output ISL file (e.g., German.isl).",
    )
    args = parser.parse_args()

    convert_po_to_isl(args.template, args.input, args.output)
