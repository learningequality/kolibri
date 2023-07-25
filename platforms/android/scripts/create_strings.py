"""
Tooling for generating i18n strings using Kolibri's translation machinery.
"""
import os
import sys
import tempfile


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
    sys.path = [os.path.join(os.path.dirname(__file__), "../src")] + sys.path

    import kolibri
    from kolibri.main import initialize
    from django.core.management import call_command

    initialize(skip_update=True)

    call_command(
        "loadingpage",
        "--output-dir",
        output_dir,
        "--version-text",
        kolibri.__version__,
    )


def create_resource_files(output_dir):
    """
    Read each language directory and create resource files in the corresponding Android values folder.
    """
    for lang_dir in os.listdir(output_dir):
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
