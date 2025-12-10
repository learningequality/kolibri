import argparse
import configparser

import polib
from definitions import LANG_DEFINITIONS


def convert_po_to_isl(
    template_isl_path, translated_po_path, output_isl_path, locale_code
):
    encoding = "utf-8-sig"

    # 1. Load PO
    po = polib.pofile(translated_po_path, encoding="utf-8")

    # 2. Create a lookup map using a Tuple: (msgid, msgctxt)
    translation_map = {
        (entry.msgid, entry.msgctxt): entry.msgstr for entry in po if entry.msgstr
    }

    # 3. Load Template
    config = configparser.ConfigParser(interpolation=None)
    config.optionxform = str
    config.read(template_isl_path, encoding=encoding)

    # 4. Update Translations
    for section in config.sections():
        for key in config[section]:
            english_string = config[section][key]

            context_key = f"[{section}]{key}"

            translated_string = translation_map.get((english_string, context_key))

            if translated_string:
                config.set(section, key, translated_string)

    # 5. Add LangOptions section
    if locale_code in LANG_DEFINITIONS:
        lang_def = LANG_DEFINITIONS[locale_code]
        if not config.has_section("LangOptions"):
            config.add_section("LangOptions")
        ui_name = lang_def.get("display_name", lang_def["inno_name"])
        config.set("LangOptions", "LanguageName", ui_name)

        config.set("LangOptions", "LanguageID", lang_def["id"])

        if "font" in lang_def:
            font_name = lang_def["font"]
            config.set("LangOptions", "DialogFontName", font_name)
            config.set("LangOptions", "WelcomeFontName", font_name)

        if lang_def.get("rtl", False):
            config.set("LangOptions", "RightToLeft", "yes")

    with open(output_isl_path, "w", encoding=encoding) as f:
        config.write(f, space_around_delimiters=False)

    print(f"Generated: {output_isl_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", "--template", required=True)
    parser.add_argument("-i", "--input", required=True)
    parser.add_argument("-o", "--output", required=True)
    parser.add_argument("-l", "--lang", required=True)
    args = parser.parse_args()

    convert_po_to_isl(args.template, args.input, args.output, args.lang)
