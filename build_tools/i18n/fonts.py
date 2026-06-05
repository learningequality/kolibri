# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "fonttools==4.49.0",
#     "requests==2.27.1",
# ]
# ///
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html
"""

import argparse
import base64
import functools
import hashlib
import io
import json
import logging
import mimetypes
import os
import re
import sys
import tempfile

import utils

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.getLogger("fontTools").setLevel(logging.WARNING)
logging.StreamHandler(sys.stdout)


import noto_source  # noqa E402

from fontTools import merge  # noqa E402
from fontTools import subset  # noqa E402


"""
Constants
"""

OUTPUT_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        os.pardir,
        os.pardir,
        "kolibri",
        "core",
        "static",
        "assets",
        "fonts",
    )
)


# Sets the source date epoch to 1/1/21 to prevent temporary files from
# getting different headers on each run, leading to non-glyph-related changes to
# their base64 encoding
# ref: https://github.com/fonttools/fonttools/issues/1135
os.environ["SOURCE_DATE_EPOCH"] = "1609459200000"
FONT_TOOLS_OPTIONS = subset.Options()
FONT_TOOLS_OPTIONS.flavor = "woff"  # most widely supported format
FONT_TOOLS_OPTIONS.ignore_missing_unicodes = True  # important for subsetting

# basic latin glyphs
NOTO_SANS_LATIN = "NotoSans"

# font family name conventions
SCOPE_FULL = "noto-full"
SCOPE_SUBSET = "noto-subset"
SCOPE_COMMON = "noto-common"

# In-memory manifest for CSS file hashes, written at end of generation
_FONT_CSS_HASHES = {}

# In-memory mapping of original WOFF filenames to hashed filenames (used during generation only)
_WOFF_HASHES = {}

"""
Shared helpers
"""


_FONT_FACE_TEMPLATE = """
@font-face {{
  font-family: '{family}';
  src: url('{url}') format('woff');
  font-style: normal;
  font-weight: {weight};
  unicode-range: {unicodes};
  font-display: {display};
}}
"""

FONT_WEIGHT_NAME_MAP = {
    "Regular": "normal",
    "SemiBold": "600",
    "Bold": "bold",
}

FONT_WEIGHT_MAP = {
    "Regular": "400",
    "SemiBold": "600",
    "Bold": "700",
}


def _gen_font_face(family, url, weight, unicodes, display="swap"):
    """
    Generate a @font-face CSS rule.

    Args:
        display: font-display value. Use 'fallback' for subset/common fonts (prevents FOUT),
                 'swap' for full fonts (allows graceful loading).
    """
    weight = FONT_WEIGHT_NAME_MAP[weight]
    return _FONT_FACE_TEMPLATE.format(
        family=family, url=url, weight=weight, unicodes=unicodes, display=display
    )


def _scoped(scope, name):
    return "{}.{}".format(scope, name)


@functools.cache
def _woff_font_path(name, weight):
    file_name = "{name}.{weight}.woff".format(name=name, weight=FONT_WEIGHT_MAP[weight])
    return os.path.join(OUTPUT_PATH, file_name)


def _load_font(path):
    guess = mimetypes.guess_type(path)
    if guess[0] not in [
        "font/ttc",
        "font/ttf",
        "font/otf",
        "font/woff",
        "application/font-sfnt",
        "application/font-woff",
    ]:
        logging.error("Not a font file: {}".format(path))
        logging.error("Guessed mimetype: '{}'".format(guess[0]))
        logging.error("If this is a text file: do you have Git LFS installed?")
        sys.exit(1)
    try:
        return subset.load_font(path, FONT_TOOLS_OPTIONS, dontLoadGlyphNames=True)
    except FileNotFoundError as e:  # noqa F821
        logging.error("Could not load font: {}".format(str(e)))
        logging.error("You may need to run: `make i18n-download-source-fonts`")
        sys.exit(1)


@functools.cache
def _font_priorities(default_font):
    """
    Given a default font, return a list of all possible font names roughly in the order
    that we ought to look for glyphs in. Many fonts contain overlapping sets of glyphs.

    Without doing this: we risk loading a bunch of random font files just because they
    happen to contain one of the glyphs, and we also risk loading the 'wrong' version
    of the glyphs if they happen to differ.
    """

    # start with the default
    font_names = [default_font]

    # look in the latin set next
    if default_font is not NOTO_SANS_LATIN:
        font_names.append(NOTO_SANS_LATIN)

    # then look at the rest of the supported languages' default fonts
    for lang_info in utils.available_languages():
        name = lang_info[utils.KEY_DEFAULT_FONT]
        if name not in font_names:
            font_names.append(name)

    # finally look at the remaining langauges
    font_names.extend([fn for fn in noto_source.FONT_MANIFEST if fn not in font_names])
    return tuple(font_names)  # Return tuple for immutability


@functools.cache
def _font_glyphs(font_path):
    """
    extract set of all glyphs from a font
    """
    glyphs = set()
    for table in _load_font(font_path)["cmap"].tables:
        glyphs |= set(table.cmap.keys())
    return glyphs


def _clean_up_fonts_directory():
    """
    Delete all generated font files.
    """
    for name in os.listdir(OUTPUT_PATH):
        if name.endswith(".css") or name.endswith(".woff"):
            os.unlink(os.path.join(OUTPUT_PATH, name))
    logging.info("Cleaned fonts directory")


def _compute_file_hash(file_path):
    """
    Compute SHA256 hash of a file.
    Returns first 32 characters of hex digest.
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()[:32]


def _get_hashed_filename(original_filename, file_path):
    """
    Generate hashed filename for a file.
    Format: {name}-{hash}.{extension}
    """
    name, ext = os.path.splitext(original_filename)
    file_hash = _compute_file_hash(file_path)
    return f"{name}-{file_hash}{ext}"


def _register_hashed_css(original_name, hashed_name):
    """
    Add CSS file mapping to in-memory manifest.
    """
    _FONT_CSS_HASHES[original_name] = hashed_name


def _write_css_hash_manifest():
    """
    Write the font CSS hash manifest.
    """
    manifest_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            os.pardir,
            os.pardir,
            "kolibri",
            "core",
            "constants",
            "font_css_hashes.json",
        )
    )

    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)

    with io.open(manifest_path, mode="w", encoding="utf-8") as f:
        json.dump(_FONT_CSS_HASHES, f, sort_keys=True, indent=2)

    logging.info(f"Wrote font CSS hash manifest with {len(_FONT_CSS_HASHES)} entries")
    _FONT_CSS_HASHES.clear()


"""
CSS helpers
"""


CSS_HEADER = """
/*
 * This is an auto-generated file, so any manual edits will be overridden.
 *
 * To regenerate, see instructions here:
 *   https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html
 *
 * This file was generated by build_tools/i18n/fonts.py
 */
"""


def _list_to_ranges(input_list):
    """
    Iterator of ranges of contiguous numbers from a list of integers.
    Ranges returned are [x, y) – in other words, y is non-inclusive.
    (from: http://code.activestate.com/recipes/496682/)
    """
    new_list = list(input_list)
    new_list.sort()
    start = new_list[0]
    currentrange = [start, start + 1]
    for item in new_list[1:]:
        if currentrange[1] == item:
            currentrange[1] += 1  # contiguous
        else:
            yield tuple(currentrange)  # new range start
            currentrange = [item, item + 1]
    yield tuple(currentrange)  # last range


def _fmt_code(code):
    return "{:x}".format(code).upper()


def _fmt_range(glyphs):
    """
    Generates a font-face-compatible 'unicode range' attribute for a given set of glyphs
    """
    fmt_ranges = []
    for r in _list_to_ranges(sorted(glyphs)):
        if r[0] == r[1] - 1:
            fmt_ranges.append("U+{}".format(_fmt_code(r[0])))
        else:
            fmt_ranges.append("U+{}-{}".format(_fmt_code(r[0]), _fmt_code(r[1] - 1)))
    return ",".join(fmt_ranges)


"""
Full Fonts
"""


def _full_font_face(font_family, font_name, weight, omit_glyphs=None):
    """
    generate the CSS reference for a single full font
    """
    if omit_glyphs is None:
        omit_glyphs = set()
    file_path = _woff_font_path(_scoped(SCOPE_FULL, font_name), weight)
    original_filename = os.path.basename(file_path)

    # Look up hashed filename
    hashed_filename = _WOFF_HASHES.get(original_filename, original_filename)
    hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)

    glyphs = _font_glyphs(hashed_path) - omit_glyphs
    if not glyphs:
        return ""
    return _gen_font_face(
        font_family, hashed_filename, weight, unicodes=_fmt_range(glyphs)
    )


def _gen_full_css_modern(lang_info):
    """
    Generates listing for all full fonts, segmented by unicode ranges and weights
    """

    # skip previously accounted for glyphs so there is no overlap between font-faces
    previous_glyphs = set()

    # all available fonts
    font_faces = []
    for font_name in _font_priorities(lang_info[utils.KEY_DEFAULT_FONT]):
        for weight in noto_source.WEIGHTS:
            font_faces.append(
                _full_font_face(
                    SCOPE_FULL, font_name, weight, omit_glyphs=previous_glyphs
                )
            )

        # Assumes all four variants have the same glyphs, from the content Regular font
        regular_path = _woff_font_path(_scoped(SCOPE_FULL, font_name), "Regular")
        original_filename = os.path.basename(regular_path)
        hashed_filename = _WOFF_HASHES.get(original_filename, original_filename)
        hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
        previous_glyphs |= _font_glyphs(hashed_path)

    original_filename = "{}.modern.css".format(
        _scoped(SCOPE_FULL, lang_info[utils.KEY_INTL_CODE])
    )
    temp_path = os.path.join(OUTPUT_PATH, original_filename + ".tmp")

    # Write to temporary file
    with open(temp_path, "w") as f:
        f.write(CSS_HEADER)
        f.write("".join(font_faces))

    # Hash and rename
    hashed_filename = _get_hashed_filename(original_filename, temp_path)
    hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
    os.rename(temp_path, hashed_path)

    # Register in manifest
    _register_hashed_css(original_filename, hashed_filename)

    logging.info("Writing {}".format(hashed_path))


def _gen_full_css_basic(lang_info):
    original_filename = "{}.basic.css".format(
        _scoped(SCOPE_FULL, lang_info[utils.KEY_INTL_CODE])
    )
    temp_path = os.path.join(OUTPUT_PATH, original_filename + ".tmp")

    # Write to temporary file
    with open(temp_path, "w") as f:
        f.write(CSS_HEADER)
        default_font = lang_info[utils.KEY_DEFAULT_FONT]
        for weight in noto_source.WEIGHTS:
            f.write(_full_font_face(SCOPE_FULL, default_font, weight))

    # Hash and rename
    hashed_filename = _get_hashed_filename(original_filename, temp_path)
    hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
    os.rename(temp_path, hashed_path)

    # Register in manifest
    _register_hashed_css(original_filename, hashed_filename)

    logging.info("Writing {}".format(hashed_path))


def _write_full_font(font_name, weight):
    font = _load_font(noto_source.get_path(font_name, weight))
    output_path = _woff_font_path(_scoped(SCOPE_FULL, font_name), weight)

    # Save to temporary file first
    temp_path = output_path + ".tmp"
    font.save(temp_path)

    # Generate hashed filename
    original_filename = os.path.basename(output_path)
    hashed_filename = _get_hashed_filename(original_filename, temp_path)
    hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)

    # Rename to hashed filename
    os.rename(temp_path, hashed_path)

    # Store mapping for CSS generation
    _WOFF_HASHES[original_filename] = hashed_filename

    logging.info("Writing {}".format(hashed_path))


def command_generate_fonts():
    """
    Generate all font files (full and subset) and create the hash manifest.
    """
    logging.info("Generating fonts...")

    # Clean up all old fonts
    _clean_up_fonts_directory()

    # Generate full fonts
    for font_name in noto_source.FONT_MANIFEST:
        for weight in noto_source.WEIGHTS:
            _write_full_font(font_name, weight)

    languages = utils.available_languages()
    for lang_info in languages:
        _gen_full_css_modern(lang_info)
        _gen_full_css_basic(lang_info)

    # Generate subset fonts
    _subset_and_merge_fonts(
        text=" ".join(_get_common_strings()),
        default_font=NOTO_SANS_LATIN,
        scope=SCOPE_COMMON,
    )

    for lang_info in languages:
        logging.info(f"Generating subset for {lang_info[utils.KEY_ENG_NAME]}")
        strings = _get_lang_strings(utils.local_locale_path(lang_info))
        _subset_and_merge_fonts(
            text=" ".join(strings),
            default_font=lang_info[utils.KEY_DEFAULT_FONT],
            scope=_scoped(SCOPE_SUBSET, lang_info[utils.KEY_INTL_CODE]),
        )

    _generate_inline_font_css(name=SCOPE_COMMON, font_family=SCOPE_COMMON)

    for lang in languages:
        _generate_inline_font_css(
            name=_scoped(SCOPE_SUBSET, lang[utils.KEY_INTL_CODE]),
            font_family=SCOPE_SUBSET,
        )

    # Write manifest with all hashed file mappings
    _write_css_hash_manifest()

    logging.info("Finished generating fonts")


"""
Subset fonts
"""


def _chunks(string, n=72):
    """
    Yield successive n-sized chunks from string
    """
    for i in range(0, len(string), n):
        yield string[i : i + n]


def _write_inline_font(file_object, font_path, font_family, weight):
    """
    Inlines a font as base64 encoding within a CSS file
    """
    with open(font_path, mode="rb") as f:
        data = f.read()
    data_uri = "data:application/x-font-woff;charset=utf-8;base64,\\\n{}".format(
        "\\\n".join(_chunks(base64.b64encode(data).decode()))
    )
    glyphs = _font_glyphs(font_path)
    if not glyphs:
        return
    file_object.write(
        _gen_font_face(
            family=font_family,
            url=data_uri,
            weight=weight,
            unicodes=_fmt_range(glyphs),
            display="fallback",  # Use fallback for subset/common fonts to prevent FOUT
        )
    )


def _generate_inline_font_css(name, font_family):
    """
    Generate CSS and clean up inlined woff files
    """

    original_filename = "{}.css".format(name)
    temp_path = os.path.join(OUTPUT_PATH, original_filename + ".tmp")

    # Write to temporary file
    with open(temp_path, "w") as f:
        f.write(CSS_HEADER)
        for weight in noto_source.WEIGHTS:
            font_path = _woff_font_path(name, weight)
            _write_inline_font(f, font_path, font_family, weight)
            os.unlink(font_path)

    # Hash and rename
    hashed_filename = _get_hashed_filename(original_filename, temp_path)
    hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
    os.rename(temp_path, hashed_path)

    # Register in manifest
    _register_hashed_css(original_filename, hashed_filename)

    logging.info("Writing {}".format(hashed_path))


def _get_subset_font(source_file_path, text):
    """
    Given a source file and some text, returns a new, in-memory fontTools Font object
    that has only the glyphs specified in the set.

    Note that passing actual text instead of a glyph set to the subsetter allows it to
    generate appropriate ligatures and other features important for correct rendering.
    """
    if not os.path.exists(source_file_path):
        logging.error("'{}' not found".format(source_file_path))

    font = _load_font(source_file_path)
    subsetter = subset.Subsetter(options=FONT_TOOLS_OPTIONS)
    subsetter.populate(text=text)
    subsetter.subset(font)
    return font


def _get_lang_strings(locale_dir):
    """
    Text used in a particular language
    """

    strings = []

    for file_name in os.listdir(locale_dir):
        if not file_name.endswith(".json"):
            continue

        file_path = os.path.join(locale_dir, file_name)
        with open(file_path, mode="r", encoding="utf-8") as f:
            lang_strings = json.load(f).values()

        for s in lang_strings:
            s = re.sub(r"\W", " ", s)  # clean whitespace
            strings.append(s)
            strings.append(s.upper())

    return strings


@functools.cache
def _get_common_strings():
    """
    Text useful for all languages: displaying the language switcher, Kolibri version
    numbers, symbols, and other un-translated text
    """

    # Special characters that are used directly in untranslated template strings.
    # Search the codebase with this regex to find new ones: [^\x00-\x7F©–—…‘’“”•→›]
    strings = [
        chr(0x0),  # null
        "©",
        "–",  # en dash
        "—",  # em dash
        "…",
        "‘",
        "’",
        "“",
        "”",
        "•",
        "●",
        "→",
        "›",
    ]

    # all the basic printable ascii characters
    strings.extend([chr(c) for c in range(32, 127)])

    # text from language names, both lower- and upper-case
    languages = utils.available_languages()
    for lang in languages:
        strings.append(lang[utils.KEY_LANG_NAME])
        strings.append(lang[utils.KEY_LANG_NAME].upper())
        strings.append(lang[utils.KEY_ENG_NAME])
        strings.append(lang[utils.KEY_ENG_NAME].upper())

    return tuple(strings)  # Return tuple for immutability


def _merge_fonts(fonts, output_file_path):
    """
    Given a list of fontTools font objects, merge them and export to output_file_path.

    Implemenatation note: it would have been nice to pass the fonts directly to the
    merger, but the current fontTools implementation of Merger takes a list of file names
    """
    tmp = tempfile.gettempdir()
    f_names = []
    for i, f in enumerate(fonts):
        tmp_font_path = os.path.join(tmp, "{}.woff".format(i))
        f_names.append(tmp_font_path)
        f.save(tmp_font_path)
    merger = merge.Merger(options=FONT_TOOLS_OPTIONS)
    merged_font = merger.merge(f_names)
    merged_font.save(output_file_path)
    logging.info("created {}".format(output_file_path))


# For reasons that are not entirely clear, these fonts do not subset well.
# They are not used in app interface text, so we exclude them from the subset font generation.
FONTS_TO_EXCLUDE_FROM_SUBSET = {
    "NotoSansCanadianAboriginal",
    "NotoSansEthiopic",
    "NotoSansSoraSompeng",
    "NotoSansSymbols",
    "NotoSansThaana",
}


def _subset_and_merge_fonts(text, default_font, scope):
    """
    Given text, generate both a bold and a regular font that can render it.
    """
    subsets = {}
    for weight in noto_source.WEIGHTS:
        subsets[weight] = []

    # track which glyphs are left
    remaining_glyphs = set([ord(c) for c in text])

    for font_name in _font_priorities(default_font):
        if font_name in FONTS_TO_EXCLUDE_FROM_SUBSET:
            continue

        for weight in noto_source.WEIGHTS:
            full_path = _woff_font_path(_scoped(SCOPE_FULL, font_name), weight)
            # Look up hashed filename for the full font
            original_filename = os.path.basename(full_path)
            hashed_filename = _WOFF_HASHES.get(original_filename, original_filename)
            hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
            subset = _get_subset_font(hashed_path, text)
            subsets[weight].append(subset)

        full_reg_path = _woff_font_path(_scoped(SCOPE_FULL, font_name), "Regular")
        # Look up hashed filename for the regular font
        original_filename = os.path.basename(full_reg_path)
        hashed_filename = _WOFF_HASHES.get(original_filename, original_filename)
        hashed_path = os.path.join(OUTPUT_PATH, hashed_filename)
        new_glyphs = _font_glyphs(hashed_path)
        remaining_glyphs -= new_glyphs
        if not remaining_glyphs:
            break

        text = "".join([c for c in text if ord(c) in remaining_glyphs])

    for weight in noto_source.WEIGHTS:
        subset_path = _woff_font_path(scope, weight)
        subset = subsets[weight]
        _merge_fonts(subset, os.path.join(OUTPUT_PATH, subset_path))


"""
Add source fonts
"""


def command_update_font_manifest(ref):
    noto_source.update_manifest(ref)


def command_download_source_fonts():
    noto_source.fetch_fonts()


def command_show_all_available_typefaces():
    noto_source.show_typefaces()


"""
Main
"""


def main():
    """
    Generates files to support both 'basic' and a 'modern' browsers.

    Both browsers get the common and language-specific application subset fonts inline
    to load quickly and prevent a flash of unstyled text, at least for all application
    text. Full font files are linked and will load asynchronously.

    # Modern behavior

    Newer browsers have full support for the unicode-range attribute of font-face
    definitions, which allow the browser to download fonts as-needed based on the text
    observed. They also support 'font-display: swap' which allows for using preloaded
    subsets. These allow us to make _all_ font alphabets available, and ensures that
    content will be rendered using the best font possible for all content, regardless
    of selected app language.

    # Basic behavior

    Older browsers do not fully support the unicode-range attribute, and will eagerly
    download all referenced fonts regardless of whether or not they are needed. This
    would have an unacceptable performance impact. As an alternative, we provide
    references to the full fonts for the user's currently-selected language, under the
    assumption that most of the content they use will be in that language.

    Content viewed in other languages using the basic variant should still usually
    display, albeit using system fonts.
    """

    description = "\n\nProcess fonts.\nSyntax: [command] [branch]\n\n"
    parser = argparse.ArgumentParser(description=description)
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser(
        "update-font-manifest",
        help="Update manifest from https://github.com/notofonts/notofonts.github.io",
    ).add_argument(
        "--ref",
        help="Github reference, e.g. commit or tag. Defaults to head of master.",
        type=str,
    )

    subparsers.add_parser(
        "show-all-available-typefaces",
        help="Show available typefaces from https://github.com/notofonts/notofonts.github.io",
    ).add_argument(
        "--ref",
        help="Github reference, e.g. commit or tag. Defaults to head of master.",
        type=str,
    )

    subparsers.add_parser(
        "download-source-fonts",
        help="Download sources from https://github.com/notofonts/notofonts.github.io",
    )

    subparsers.add_parser("generate-fonts", help="Generate all font files")

    args = parser.parse_args()

    if args.command == "update-font-manifest":
        command_update_font_manifest(args.ref)
    elif args.command == "show-all-available-typefaces":
        command_show_all_available_typefaces()
    elif args.command == "download-source-fonts":
        command_download_source_fonts()
    elif args.command == "generate-fonts":
        command_generate_fonts()
    else:
        logging.warning("Unknown command\n")
        parser.print_help(sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
