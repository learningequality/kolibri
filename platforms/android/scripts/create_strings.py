"""
Tooling for generating i18n strings using Kolibri's translation machinery.
"""
import json
import os
import tempfile
import xml.etree.ElementTree as ET
from importlib import resources

from version import apk_version


# By default we will map the locale code to e.g. "en-us" to "en-rUS"
# except for mapping specified below.

locale_code_map = {
    "es-419": "b+es+419",
    "zh-hans": "zh",
}

XML_TEMPLATE = """
<resources>
    <string name="loading_page_html"><![CDATA[
        {}
    ]]></string>
</resources>
"""

# The language code that will be used for the non-prefixed values folder
DEFAULT_LANGUAGE = "en"


def generate_loading_pages(output_dir):
    """
    Run the Django management command to generate the loading pages.
    """
    # Add the local Kolibri source directory to the path

    from kolibri.main import initialize
    from django.core.management import call_command

    initialize(skip_update=True)

    call_command(
        "loadingpage",
        "--output-dir",
        output_dir,
        "--version-text",
        apk_version().replace("-official", ""),
    )


def _find_string(lang, string):
    from kolibri.main import initialize
    from django.utils.translation import override
    from django.utils.translation import ugettext as _
    from django.utils.translation import to_locale

    initialize(skip_update=True)

    with override(lang):
        new_string = _(string)
        if new_string != string and new_string:
            return new_string

    for message_file in os.listdir(
        resources.files("kolibri") / "locale" / "en" / "LC_MESSAGES"
    ):
        if message_file.endswith(".json"):
            with open(
                resources.files("kolibri")
                / "locale"
                / "en"
                / "LC_MESSAGES"
                / message_file,
                "r",
            ) as f:
                messages = json.load(f)
                for key, value in messages.items():
                    if value == string:
                        try:
                            # Do this in case we have a legacy translation file - this should be cleaned up
                            # in a future version of Kolibri
                            with open(
                                resources.files("kolibri")
                                / "locale"
                                / to_locale(lang)
                                / "LC_MESSAGES"
                                / message_file,
                                "r",
                            ) as lang_message_file:
                                messages = json.load(lang_message_file)
                                new_string = messages[key]
                                if new_string != string and new_string:
                                    return new_string
                                # If we have a translation but the string is no different in translation, it means we should
                                # not include it in the strings.xml file
                                return None
                        except FileNotFoundError:
                            break
    return None


# Strings that we only access from Python, so we don't need to include them in the strings.xml file
PYTHON_ONLY_STRINGS = [
    "Learner",
]


def create_resource_files(output_dir):  # noqa: C901
    """
    Read each language directory and create resource files in the corresponding Android values folder.
    """
    en_strings_file = os.path.join(
        os.path.dirname(__file__),
        "../python-for-android/dists/kolibri/src/main/res/values/strings.xml",
    )

    en_strings_tree = ET.parse(en_strings_file)

    en_strings_root = en_strings_tree.getroot()

    all_langs = list(os.listdir(output_dir))

    for lang_dir in all_langs:
        if lang_dir == DEFAULT_LANGUAGE:
            dir_name = "values"
        else:
            if lang_dir in locale_code_map:
                locale_dir = locale_code_map[lang_dir]
            else:
                parts = lang_dir.split("-")
                if len(parts) == 1:
                    locale_dir = lang_dir
                elif len(parts) == 2:
                    locale_dir = f"{parts[0]}-r{parts[1].upper()}"
                else:
                    raise ValueError(f"Invalid language code: {lang_dir}")
            dir_name = f"values-{locale_dir}"

        values_dir = os.path.join(
            os.path.dirname(__file__),
            "../python-for-android/dists/kolibri/src/main/res",
            dir_name,
        )

        os.makedirs(values_dir, exist_ok=True)

        with open(os.path.join(output_dir, lang_dir, "loading.html"), "r") as f:
            html_content = f.read().replace("'", "\\'").replace('"', '\\"')

        xml_content = XML_TEMPLATE.format(html_content)

        with open(os.path.join(values_dir, "html_content.xml"), "w") as f:
            f.write(xml_content)

        if lang_dir == DEFAULT_LANGUAGE:
            continue

        new_root = ET.Element("resources")
        new_tree = ET.ElementTree(element=new_root)

        for string in en_strings_root.findall("string"):
            name = string.get("name")
            value = _find_string(lang_dir, string.text)
            if value is None:
                continue
            new_string = ET.SubElement(new_root, "string", attrib={"name": name})
            new_string.text = value

        new_tree.write(
            os.path.join(values_dir, "strings.xml"),
            encoding="utf-8",
            xml_declaration=True,
        )

    # Create the Python strings file
    output = "# This file is auto-generated by the create_strings.py script. Do not edit it directly."
    output += "\ni18n_strings = {"
    for python_string in PYTHON_ONLY_STRINGS:
        output += "\n    " + f"'{python_string}': " + "{"
        for lang_dir in all_langs:
            value = _find_string(lang_dir, python_string)
            if value is None:
                continue
            output += f"\n        '{lang_dir}': '{value}', "
        output += "\n    },"
    output += "\n}\n"
    with open(os.path.join(os.path.dirname(__file__), "../src/strings.py"), "w") as f:
        f.write(output)


def main():
    """
    Run the script to generate the loading pages and create the Android resource files.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        generate_loading_pages(temp_dir)
        create_resource_files(temp_dir)


if __name__ == "__main__":
    # Actually run the script
    main()
