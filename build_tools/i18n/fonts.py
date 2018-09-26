# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html
"""
import argparse
import base64
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

FONTS_SOURCE = os.path.abspath(
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
FONTS_MANIFEST_PATH = os.path.join(FONTS_SOURCE, "noto-manifest.json")
TTF_PATH = os.path.join(FONTS_SOURCE, "noto-sources")

with open(FONTS_MANIFEST_PATH, "r") as mf:
    FONT_MANIFEST = json.load(mf)

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


FONT_TOOLS_OPTIONS = subset.Options()
FONT_TOOLS_OPTIONS.flavor = "woff"  # most widely supported format
FONT_TOOLS_OPTIONS.ignore_missing_unicodes = True  # importent for subsetting


"""
Shared helpers
"""


_FONT_FACE = """
@font-face {{
  font-family: '{family}';
  src: url('{url}') format('woff');
  font-style: normal;
  font-weight: {weight};
  font-display: swap;
}}
"""

_FONT_FACE_UNICODES = """
@font-face {{
  font-family: '{family}';
  src: url('{url}') format('woff');
  font-style: normal;
  font-weight: {weight};
  unicode-range: {unicodes};
  font-display: swap;
}}
"""


def _gen_font_face(family, url, is_bold, unicodes):
    weight = "bold" if is_bold else "normal"
    if unicodes:
        return _FONT_FACE_UNICODES.format(
            family=family, url=url, weight=weight, unicodes=unicodes
        )
    return _FONT_FACE.format(family=family, url=url, weight=weight)


@utils.memoize
def _woff_font_name(name, is_ui, is_full, is_bold):
    return "{type}.{scope}.{name}.{weight}.woff".format(
        type="ui" if is_ui else "content",
        name=name,
        scope="full" if is_full else "subset",
        weight="700" if is_bold else "400",
    )


@utils.memoize
def _woff_font_path(name, is_ui, is_full, is_bold):
    return os.path.join(OUTPUT_PATH, _woff_font_name(name, is_ui, is_full, is_bold))


@utils.memoize
def _ttf_font_path(font_info, is_ui=False, is_bold=False):
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
        return os.path.join(TTF_PATH, "{}UI-{}.ttf".format(font_name, weight))
    return os.path.join(TTF_PATH, "{}-{}.ttf".format(font_name, weight))


def _load_font(path):
    return subset.load_font(path, FONT_TOOLS_OPTIONS, dontLoadGlyphNames=True)


def _get_font_info(name):
    for font_info in FONT_MANIFEST:
        if font_info["name"] == name:
            return font_info
    raise KeyError(name)


"""
Generate CSS
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
    return ", ".join(fmt_ranges)


@utils.memoize
def _font_glyphs(font_path):
    """
    extract of all glyphs from a font
    """
    glyphs = set()
    for table in _load_font(font_path)["cmap"].tables:
        glyphs |= set(table.cmap.keys())
    return glyphs


def _full_font_face(font_family, font_name, is_ui, is_bold, omit_glyphs=set()):
    file_name = _woff_font_name(font_name, is_ui=is_ui, is_full=True, is_bold=is_bold)
    file_path = _woff_font_path(font_name, is_ui=is_ui, is_full=True, is_bold=is_bold)
    glyphs = _font_glyphs(file_path) - omit_glyphs
    if not glyphs:
        return ""
    return _gen_font_face(
        font_family, file_name, is_bold=is_bold, unicodes=_fmt_range(glyphs)
    )


def _modern_font_faces():
    """
    Generates listing of all full fonts, segmented by unicode ranges and weights
    """

    # build up a list of font-face strings
    font_faces = []

    # skip previously accounted for glyphs so there is no overlap between font-faces
    previous_ui_glyphs = _get_common_glyphs()
    previous_content_glyphs = set()

    # all available fonts
    for font_info in FONT_MANIFEST:

        # regular content
        font_faces.append(
            _full_font_face(
                "noto-content",
                font_info["name"],
                is_ui=False,
                is_bold=False,
                omit_glyphs=previous_content_glyphs,
            )
        )
        # bold content
        font_faces.append(
            _full_font_face(
                "noto-content",
                font_info["name"],
                is_ui=False,
                is_bold=True,
                omit_glyphs=previous_content_glyphs,
            )
        )

        # regular UI
        font_faces.append(
            _full_font_face(
                "noto-ui",
                font_info["name"],
                is_ui=font_info["has_ui_variant"],
                is_bold=False,
                omit_glyphs=previous_ui_glyphs,
            )
        )
        # bold UI
        font_faces.append(
            _full_font_face(
                "noto-ui",
                font_info["name"],
                is_ui=font_info["has_ui_variant"],
                is_bold=True,
                omit_glyphs=previous_ui_glyphs,
            )
        )

        # Assumes all four variants have the same glyphs, from the Content Regular font
        new_glyphs = _font_glyphs(
            _woff_font_path(font_info["name"], is_ui=False, is_full=True, is_bold=False)
        )
        previous_content_glyphs |= new_glyphs
        previous_ui_glyphs |= new_glyphs

    return "".join(font_faces)


def _write_inline_ui_font(file_object, font_name, font_family, is_bold):
    font_path = _woff_font_path(font_name, is_ui=True, is_full=False, is_bold=is_bold)
    with io.open(font_path, mode="rb") as f:
        data = f.read()
    data_uri = "data:application/x-font-woff;charset=utf-8;base64,{}".format(
        base64.b64encode(data).decode()
    )
    glyphs = _font_glyphs(font_path)
    if not glyphs:
        return
    file_object.write(
        _gen_font_face(
            family=font_family,
            url=data_uri,
            is_bold=is_bold,
            unicodes=_fmt_range(glyphs),
        )
    )


def _generate_css_for_language(lang):
    css_file_modern = os.path.join(
        OUTPUT_PATH, "fonts.{}.modern.css".format(utils.locale_string(lang))
    )
    css_file_basic = os.path.join(
        OUTPUT_PATH, "fonts.{}.basic.css".format(utils.locale_string(lang))
    )
    with open(css_file_modern, "w") as modern, open(css_file_basic, "w") as basic:
        # Common subsets of UI font for both modern and basic
        _write_inline_ui_font(modern, "Common", "noto-ui", is_bold=False)
        _write_inline_ui_font(modern, "Common", "noto-ui", is_bold=True)
        _write_inline_ui_font(basic, "Common", "noto-ui", is_bold=False)
        _write_inline_ui_font(basic, "Common", "noto-ui", is_bold=True)

        # Language-specific subsets of UI font for both modern and basic
        lang_name = utils.locale_string(lang)
        _write_inline_ui_font(modern, lang_name, "noto-ui", is_bold=False)
        _write_inline_ui_font(modern, lang_name, "noto-ui", is_bold=True)
        _write_inline_ui_font(basic, lang_name, "noto-ui", is_bold=False)
        _write_inline_ui_font(basic, lang_name, "noto-ui", is_bold=True)

        # Full UI font of default language for basic only
        name = lang[utils.KEY_DEFAULT_FONT]
        font_info = _get_font_info(name)

        basic.write(
            _full_font_face(
                "noto-ui",
                font_name=name,
                is_ui=font_info["has_ui_variant"],
                is_bold=False,
                omit_glyphs=_get_common_glyphs(),
            )
        )
        basic.write(
            _full_font_face(
                "noto-ui",
                font_name=name,
                is_ui=font_info["has_ui_variant"],
                is_bold=True,
                omit_glyphs=_get_common_glyphs(),
            )
        )

        # Full content font of default language for basic only
        basic.write(
            _full_font_face("noto-content", font_name=name, is_ui=False, is_bold=False)
        )
        basic.write(
            _full_font_face("noto-content", font_name=name, is_ui=False, is_bold=True)
        )


def command_gen_css():
    """
    Generates two css files for each language: a 'basic' and a 'modern' variant.

    Both versions include the common and language-specific application 'UI' subset fonts
    inline to load quickly and prevent a flash of unstyled text, at least for all
    application text.

    Full 'content' font files are linked and will load asynchronously. This means that
    content might have a flash of unstyled text while the font is loading. However, we
    provide the UI subsets as backup so in many cases the flash might not be significant.

    # Modern behavior

    Newer browsers have full support for the unicode-range attribute of font-face
    definitions, which allow the browser to download fonts as-needed based on the text
    observed. This allows us to make _all_ font alphabets available, and ensures that
    content will be rendered using the best font possible for all content, regardless
    of selected app langage.

    # Basic behavior

    Older browsers do not fully support the unicode-range attribute, and will eagerly
    download all referenced fonts regardless of whether or not they are needed. This
    would have an unnacceptable performance impact. As an alternative, we provide
    references to the full fonts for the user's currently-selected langage, under the
    assumption that most of the content they consume will be in the same language.

    Content viewed in other languages using the basic variant should still usually
    display, albeit using system fonts.
    """

    logging.info("Fonts: generating css...")

    # generate language-specific font files
    for lang in utils.supported_languages(include_english=True):
        _generate_css_for_language(lang)

    # for all modern browsers, add all fonts references segmented by unicode range
    css_file_modern = os.path.join(OUTPUT_PATH, "all-fonts.css")
    with open(css_file_modern, "w") as f:
        f.write(_modern_font_faces())

    logging.info("Fonts: finished generating css")


"""
Full Fonts
"""


def _write_full_font(font_info, is_ui=False, is_bold=False):
    font = _load_font(_ttf_font_path(font_info, is_ui=False, is_bold=is_bold))
    font.save(
        _woff_font_path(font_info["name"], is_ui=is_ui, is_full=True, is_bold=is_bold)
    )


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
    subsetter = subset.Subsetter(options=FONT_TOOLS_OPTIONS)
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
                # include upper-case variant for use in buttons
                code_points.add(ord(char.upper()))
    return code_points


@utils.memoize
def _get_common_glyphs():
    """
    Glyphs necessary for all languages: displaying the language switcher,
    Kolibri version numbers, the 'copywrite' symbol, and other un-translated text
    """
    # null, form feed, carriage return
    code_points = set((0x0, 0xC, 0xD))
    # copywrite, m-dash, ellipsis, curly quotes
    for c in "©–…‘’“”":
        code_points.add(ord(c))
    # all the basic printable ascii characters
    for c in range(32, 127):
        code_points.add(c)
    # glyphs from language names, both lower- and upper-case
    for lang in utils.supported_languages():
        for c in lang[utils.KEY_LANG_NAME]:
            code_points.add(ord(c))
            code_points.add(ord(c.upper()))
        for c in lang[utils.KEY_ENG_NAME]:
            code_points.add(ord(c))
            code_points.add(ord(c.upper()))
    return code_points


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
    merger = merge.Merger(options=FONT_TOOLS_OPTIONS)
    merged_font = merger.merge(f_names)
    merged_font.save(output_file_path)
    logging.info("Fonts: created {}".format(output_file_path))


def _cannot_merge(font):
    # all fonts must have equal units per em for merging, and 1000 is most common
    return font["head"].unitsPerEm != 1000


def _subset_and_merge_ui_fonts(glyphs, reg_woff_path, bold_woff_path):
    """
    Given a list of glyphs, generate both a bold and a regular font with all glyphs.
    """
    reg_subsets = []
    bold_subsets = []
    for font_info in FONT_MANIFEST:
        reg_ttf_path = _ttf_font_path(font_info, is_ui=True, is_bold=False)
        bold_ttf_path = _ttf_font_path(font_info, is_ui=True, is_bold=True)
        reg_subset = _get_subset_font(reg_ttf_path, glyphs)
        bold_subset = _get_subset_font(bold_ttf_path, glyphs)

        if _cannot_merge(reg_subset) or _cannot_merge(bold_subset):
            logging.warning("Fonts: {} has incompatible metrics".format(reg_ttf_path))
            continue

        reg_subsets.append(reg_subset)
        bold_subsets.append(bold_subset)

    _merge_fonts(reg_subsets, os.path.join(OUTPUT_PATH, reg_woff_path))
    _merge_fonts(bold_subsets, os.path.join(OUTPUT_PATH, bold_woff_path))


def command_gen_subset_fonts():
    """
    Creates custom fonts that attempt to contain all the glyphs (and only the glyphs)
    that are used in user-facing text for the translation in each language.
    """
    logging.info("Fonts: generating subset fonts...")

    # First, generate common fonts
    common_glyphs = _get_common_glyphs()

    reg_font_path = _woff_font_path("Common", is_ui=True, is_full=False, is_bold=False)
    bold_font_path = _woff_font_path("Common", is_ui=True, is_full=False, is_bold=True)
    _subset_and_merge_ui_fonts(common_glyphs, reg_font_path, bold_font_path)

    # Next, generate a UI font subset for each language based on app text
    for lang in utils.supported_languages(include_english=True):
        lang_glyphs = _get_lang_glyphs(lang, utils.local_locale_path(lang))
        lang_glyphs |= _get_lang_glyphs(lang, utils.local_perseus_locale_path(lang))
        lang_glyphs -= common_glyphs

        name = utils.locale_string(lang)

        reg_font_path = _woff_font_path(name, is_ui=True, is_full=False, is_bold=False)
        bold_font_path = _woff_font_path(name, is_ui=True, is_full=False, is_bold=True)
        _subset_and_merge_ui_fonts(lang_glyphs, reg_font_path, bold_font_path)

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

        target_path = os.path.join(TTF_PATH, file_name)
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
    subparsers.add_parser("generate-css", help="Generate CSS")
    args = parser.parse_args()

    if args.command == "add-source-fonts":
        command_add_source_fonts(args.fontname)
    elif args.command == "generate-subset-fonts":
        command_gen_subset_fonts()
    elif args.command == "generate-full-fonts":
        command_gen_full_fonts()
    elif args.command == "generate-css":
        command_gen_css()
    else:
        logging.warning("Unknown command\n")
        parser.print_help(sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
