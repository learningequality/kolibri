"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html
"""
import argparse
import io
import json
import logging
import os
import sys
import tempfile

import requests
import utils
from fontTools import merge
from fontTools import subset

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


"""
Constants
"""

FONTS_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        os.pardir,
        os.pardir,
        "kolibri",
        "core",
        "assets",
        "src",
        "styles",
        "fonts",
    )
)
UI_FONTS_PATH = os.path.join(FONTS_PATH, "generated")
FONTS_MANIFEST_PATH = os.path.join(FONTS_PATH, "noto-manifest.json")
NOTO_SOURCES_PATH = os.path.join(FONTS_PATH, "noto-sources")

with open(FONTS_MANIFEST_PATH, "r") as mf:
    FONT_MANIFEST = json.load(mf)


OPTIONS = subset.Options()
OPTIONS.desubroutinize = True
OPTIONS.ignore_missing_unicodes = True  # helps with subsetting
OPTIONS.flavor = "woff"  # correct formats


"""
Shared helpers
"""


_FONT_FACE = """
@font-face {{
  font-family: '{family}';
  src: url('./{file_name}') format('woff');
  font-style: normal;
  font-weight: {weight};
}}
"""

_FONT_FACE_UNICODES = """
@font-face {{
  font-family: '{family}';
  src: url('./{file_name}') format('woff');
  font-style: normal;
  font-weight: {weight};
  unicode-range: {unicodes};
}}
"""


def _gen_font_face(family, file_name, is_bold, unicodes=None):
    weight = "bold" if is_bold else "normal"
    if unicodes:
        return _FONT_FACE_UNICODES.format(
            family=family, file_name=file_name, weight=weight, unicodes=unicodes
        )
    return _FONT_FACE.format(family=family, file_name=file_name, weight=weight)


def _font_file_name(name, is_ui, is_full, is_bold):
    return "{type}.{scope}.{name}.{weight}.{loader}".format(
        type="ui" if is_ui else "content",
        name=name,
        scope="full" if is_full else "subset",
        weight="700" if is_bold else "400",
        loader="woff" if is_full else "inline-woff",
    )


def _load_font(path):
    return subset.load_font(path, OPTIONS, dontLoadGlyphNames=True)


def _font_path(font_info, is_ui=False, is_bold=False):
    """
    'User Interface' variants of fonts are sometimes available for languages with
    tall glyph heights, and are redrawn to fit within constrained vertical space.
    Not all fonts have or need a 'UI' variant.

    Normal variants are easier to read but have fewer guarantees about whether they
    will fit within UI elements.
    """
    font_name = font_info["name"]
    weight = "bold" if is_bold else "regular"
    if is_ui and font_info["has_ui_variant"]:
        return os.path.join(NOTO_SOURCES_PATH, "{}UI-{}.ttf".format(font_name, weight))
    return os.path.join(NOTO_SOURCES_PATH, "{}-{}.ttf".format(font_name, weight))


"""
Full fonts
"""


def _list_to_ranges(input_list):
    """
    Iterator of ranges of contiguous numbers from a list of integers.
    Ranges returned are [x, y) - e.g. y is non-inclusive.
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
    return "U+{:x}".format(code).upper()


def _font_face_unicode_range(font):
    """
    Generates a font-face-compatible 'unicode range' attribute for a given font
    """
    glyphs = set()
    for table in font["cmap"].tables:
        glyphs = glyphs | set(table.cmap.keys())
    fmt_ranges = []
    for r in _list_to_ranges(sorted(glyphs)):
        if r[0] == r[1] - 1:
            fmt_ranges.append(_fmt_code(r[0]))
        else:
            fmt_ranges.append("{}-{}".format(_fmt_code(r[0]), _fmt_code(r[1] - 1)))
    return ", ".join(fmt_ranges)


def _write_full_font(font_info, is_ui=False, is_bold=False):
    font = _load_font(_font_path(font_info, is_ui=False, is_bold=False))
    font_name = _font_file_name(
        font_info["name"], is_ui=is_ui, is_full=True, is_bold=is_bold
    )
    font.save(os.path.join(UI_FONTS_PATH, font_name))


def command_gen_full_fonts():
    logging.info("Fonts: generating full fonts...")

    for font_info in FONT_MANIFEST:
        _write_full_font(font_info, is_ui=False, is_bold=False)
        _write_full_font(font_info, is_ui=False, is_bold=True)
        if font_info["has_ui_variant"]:
            _write_full_font(font_info, is_ui=True, is_bold=False)
            _write_full_font(font_info, is_ui=True, is_bold=True)

    logging.info("Fonts: finished generating full fonts")


"""
Subset fonts
"""


def _get_subset_font(source_file_path, code_points):
    """
    Given a TTF file and a set of code points, returns a new, in-memory fontTools
    Font object that has only the glyphs specified in the set.
    """
    if not os.path.exists(source_file_path):
        logging.error("Fonts: '{}' not found".format(source_file_path))

    font = _load_font(source_file_path)
    subsetter = subset.Subsetter(options=OPTIONS)
    subsetter.populate(unicodes=code_points)
    subsetter.subset(font)
    return font


def _get_lang_glyphs(lang, locale_dir):
    code_points = set()
    for file_name in os.listdir(locale_dir):
        if not file_name.endswith(".json"):
            continue
        file_path = os.path.join(locale_dir, file_name)
        with io.open(file_path, mode="r", encoding="utf-8") as f:
            strings = json.load(f).values()

        for string in strings:
            for char in string:
                code_points.add(ord(char))
    return code_points


def _get_common_glyphs():
    """
    Glyphs necessary for all languages: displaying the language switcher,
    Kolibri version numbers, the 'copywrite' symbol, and other un-translated text.
    """
    code_points = set()
    # all the basic printable ascii characters
    for c in range(32, 127):
        code_points.add(c)
    # copywrite symbol
    code_points.add(ord("©"))
    # glyphs from language names
    for lang in utils.supported_languages():
        for c in lang[utils.KEY_LANG_NAME]:
            code_points.add(ord(c))
        for c in lang[utils.KEY_ENG_NAME]:
            code_points.add(ord(c))
    return code_points


def _create_ui_css(scss_file_name, reg_name, bold_name):
    with open(os.path.join(UI_FONTS_PATH, scss_file_name), "w") as f:
        f.write(_gen_font_face(family="ui-subset", file_name=reg_name, is_bold=False))
        f.write(_gen_font_face(family="ui-subset", file_name=bold_name, is_bold=True))


def _merge_fonts(fonts, output_file_path):
    """
    Given a list of fontTools font objects, merge them and export to output_file_path.

    Implemenatation note: it would have been nice to pass the fonts directly to the
    merger, but the current fontTools implementation of Merger takes a list of file names
    """
    tmp = tempfile.gettempdir()
    f_names = []
    for i, f in enumerate(fonts):
        tmp_font_path = os.path.join(tmp, "{}.ttf".format(i))
        f_names.append(tmp_font_path)
        f.save(tmp_font_path)
    merger = merge.Merger(options=OPTIONS)
    merged_font = merger.merge(f_names)
    merged_font.save(output_file_path)
    logging.info("Fonts: created {}".format(output_file_path))


def _cannot_merge(font):
    # all fonts must have equal units per em for merging, and 1000 is most common
    return font["head"].unitsPerEm != 1000


def _subset_and_merge_ui_fonts(glyphs, reg_name, bold_name):
    """
    Given a list of glyphs, generate both a bold and a regular font with all glyphs.
    """
    reg_subsets = []
    bold_subsets = []
    for font_info in FONT_MANIFEST:
        reg_path = _font_path(font_info, is_ui=True, is_bold=False)
        bold_path = _font_path(font_info, is_ui=True, is_bold=True)
        reg_subset = _get_subset_font(reg_path, glyphs)
        bold_subset = _get_subset_font(bold_path, glyphs)

        if _cannot_merge(reg_subset) or _cannot_merge(bold_subset):
            logging.warning("Fonts: {} has incompatible metrics".format(reg_path))
            continue

        reg_subsets.append(reg_subset)
        bold_subsets.append(bold_subset)

    _merge_fonts(reg_subsets, os.path.join(UI_FONTS_PATH, reg_name))
    _merge_fonts(bold_subsets, os.path.join(UI_FONTS_PATH, bold_name))


def command_gen_subset_fonts():
    """
    Creates custom fonts that attempt to contain all the glyphs (and only the glyphs)
    that are used in user-facing text for the translation in each language.
    """
    logging.info("Fonts: generating subset fonts...")

    # First, generate common fonts
    common_glyphs = _get_common_glyphs()

    reg_font_file = _font_file_name("Common", is_ui=True, is_full=False, is_bold=False)
    bold_font_file = _font_file_name("Common", is_ui=True, is_full=False, is_bold=True)
    _subset_and_merge_ui_fonts(common_glyphs, reg_font_file, bold_font_file)
    _create_ui_css("ui.subset.Common.scss", reg_font_file, bold_font_file)

    # Next, generate a UI font subset for each language based on app text
    for lang in utils.supported_languages(include_english=True):
        lang_glyphs = _get_lang_glyphs(lang, utils.local_locale_path(lang))
        lang_glyphs |= _get_lang_glyphs(lang, utils.local_perseus_locale_path(lang))
        lang_glyphs -= common_glyphs

        name = lang[utils.KEY_CROWDIN_CODE]

        reg_font_file = _font_file_name(name, is_ui=True, is_full=False, is_bold=False)
        bold_font_file = _font_file_name(name, is_ui=True, is_full=False, is_bold=True)
        _subset_and_merge_ui_fonts(lang_glyphs, reg_font_file, bold_font_file)
        _create_ui_css("ui.subset.{}.scss".format(name), reg_font_file, bold_font_file)

    logging.info("Fonts: created")


"""
Add source fonts
"""


def _get_variations(font_name):
    """
    For a given font name, return information about the four relevant variations on
    the font, and how we expect it the files to be named on github.

    Returns four tuples of the form:
        (directory_name, file_name, is_ui)
    """
    d_name = "{name}{ui}"
    f_name = "{name}{ui}-{weight}.ttf"
    return [
        (
            d_name.format(name=font_name, ui=""),
            f_name.format(name=font_name, ui="", weight="Regular"),
            False,
        ),
        (
            d_name.format(name=font_name, ui=""),
            f_name.format(name=font_name, ui="", weight="Bold"),
            False,
        ),
        (
            d_name.format(name=font_name, ui="UI"),
            f_name.format(name=font_name, ui="UI", weight="Regular"),
            True,
        ),
        (
            d_name.format(name=font_name, ui="UI"),
            f_name.format(name=font_name, ui="UI", weight="Bold"),
            True,
        ),
    ]


def command_add_source_fonts(font_name):
    """
    Attempts to pull individual ttf fonts out of the github repo at:
      https://github.com/googlei18n/noto-fonts/
    """
    logging.info("Fonts: trying to extract files for '{}'.".format(font_name))
    logging.info(
        "Note that this function will break when Google changes their repo structure."
    )

    base_url = "https://github.com/googlei18n/noto-fonts/raw/master/phaseIII_only/hinted/ttf/{directory}/{file}"

    new_manifest = FONT_MANIFEST
    has_ui_variant = True

    # extract each applicable font file
    for directory_name, file_name, is_ui in _get_variations(font_name):
        target_url = base_url.format(directory=directory_name, file=file_name)
        r = requests.get(target_url, allow_redirects=True)
        if r.status_code == 404:
            logging.warning("\tNot found: {}".format(target_url))
            if is_ui:
                has_ui_variant = False
            continue
        else:
            r.raise_for_status()

        target_path = os.path.join(NOTO_SOURCES_PATH, file_name)
        with open(target_path, "wb") as f:
            f.write(r.content)
            logging.info("\tDownloaded: {}".format(target_url))

    # update manifest
    already_exists = False
    for font_info in new_manifest:
        if font_info["font_name"] == font_name:
            already_exists = True
            font_info["has_ui_variant"] = has_ui_variant
            continue
    if not already_exists:
        new_manifest.append({"name": font_name, "has_ui_variant": has_ui_variant})
    logging.info(
        "Updating manifest - '{}' {} UI variant".format(
            font_name, "with" if has_ui_variant else "without"
        )
    )
    with open(FONTS_MANIFEST_PATH, "w") as mf:
        json.dump(sorted(new_manifest, key=lambda d: d["name"]), mf, indent=2)
    logging.info("Fonts: extraction complete")


"""
Main
"""


def main():
    description = "\n\nProcess fonts.\nSyntax: [command] [branch]\n\n"
    parser = argparse.ArgumentParser(description=description)
    subparsers = parser.add_subparsers(dest="command")
    parser_add_source_fonts = subparsers.add_parser(
        "add-source-fonts",
        help="Download TTF files from https://github.com/googlei18n/noto-fonts/",
    )
    parser_add_source_fonts.add_argument(
        "fontname",
        help="Name of a Noto font, e.g. NotoSansBengaliUI or NotoSansArabic",
        type=str,
    )
    subparsers.add_parser(
        "generate-subset-fonts",
        help="Generate subset UI fonts and CSS based on app text",
    )
    subparsers.add_parser(
        "generate-full-fonts", help="Generate full UI and content fonts"
    )
    args = parser.parse_args()

    if args.command == "add-source-fonts":
        command_add_source_fonts(args.fontname)
    elif args.command == "generate-subset-fonts":
        command_gen_subset_fonts()
    elif args.command == "generate-full-fonts":
        command_gen_full_fonts()
    else:
        logging.warning("Unknown command\n")
        parser.print_help(sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
