"""
Fetch the unofficial Inno Setup language files the compiler does not ship, which
the installer build chains for the languages Inno translates unofficially.

With --english-messages, also rewrite the English [Messages] source Crowdin
translates. That file is committed, so run it after bumping the Inno Setup
version in .github/workflows/platform-windows-app-build_exe.yml, keeping
INNO_TAG in step.
"""

import argparse
import configparser
import urllib.request
from pathlib import Path

from definitions import INNO_DEFAULT
from definitions import LANG_DEFINITIONS
from write_language_files import UNOFFICIAL_DIR

# Matches the choco `innosetup --version` pin in platform-windows-app-build_exe.yml.
INNO_TAG = "is-6_6_1"
SOURCE_URL = "https://raw.githubusercontent.com/jrsoftware/issrc/{tag}/Files/{path}"


def vendored_files():
    """Only the Unofficial/ translations, which issrc has but the compiler does not.

    Inno Setup's setup.iss installs `files\\Languages\\*.isl`, so kolibri.iss reaches
    the official ones (and Default.isl) through `compiler:` instead.
    """
    return sorted(
        lang["inno_file"]
        for lang in LANG_DEFINITIONS.values()
        if lang.get("inno_file", "").startswith(UNOFFICIAL_DIR)
    )


def fetch(path, tag):
    url = SOURCE_URL.format(tag=tag, path=path)
    with urllib.request.urlopen(url) as response:
        return response.read()


def download(inno_dir, tag):
    inno_dir.mkdir(parents=True, exist_ok=True)
    for path in vendored_files():
        (inno_dir / Path(path).name).write_bytes(fetch(path, tag))
        print(f"  -> {path}")  # noqa: T201


def write_english_messages(default_isl, output_path):
    config = configparser.ConfigParser(allow_no_value=True, interpolation=None)
    config.optionxform = str
    config.read_string(default_isl.decode("utf-8-sig"))

    lines = ["[Messages]"]
    lines.extend(f"{key}={value}" for key, value in config["Messages"].items())
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  -> {output_path}")  # noqa: T201


def main(translations_dir, tag, english_messages):
    print("Fetching the unofficial Inno Setup language files...")  # noqa: T201
    download(translations_dir / "inno", tag)

    if english_messages:
        print("Writing the English [Messages] source...")  # noqa: T201
        write_english_messages(
            fetch(INNO_DEFAULT, tag),
            translations_dir / "locale" / "en" / "messages.isl",
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-d",
        "--translations-dir",
        type=Path,
        default=Path(__file__).parent,
        help="The installer translations directory",
    )
    parser.add_argument("--tag", default=INNO_TAG, help="issrc tag to fetch from")
    parser.add_argument(
        "--english-messages",
        action="store_true",
        help="Also rewrite the committed English [Messages] Crowdin source",
    )
    args = parser.parse_args()

    main(args.translations_dir, args.tag, args.english_messages)
