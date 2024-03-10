import json
import logging
import os
import re
import sys
from functools import reduce
from io import BytesIO
from operator import and_

import requests
import utils
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# Rely on the fact that this module is only
# imported from the fonts.py module, which ensures
# that the fontTools library is available.


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


"""
    These utility functions allow us to maintain the noto source manifest file and
    download source files from Google's Github repos.
"""


# local paths
FONTS_SOURCE = os.path.abspath(os.path.join(os.path.dirname(__file__), "noto_source"))

FONT_MANIFEST_NAME = "manifest.json"
FONT_MANIFEST_PATH = os.path.join(FONTS_SOURCE, FONT_MANIFEST_NAME)
with open(FONT_MANIFEST_PATH, "r") as mf:
    MANIFEST = json.load(mf)

EXCLUDED_TYPEFACES = set(
    [
        # Kawi is an old Javanese script used for texts from the 8th to 16th centuries, so we exclude it.
        # https://en.wikipedia.org/wiki/Kawi_script
        "NotoSansKawi",
        # Syriac alphabet - https://en.wikipedia.org/wiki/Syriac_alphabet
        # The base Syriac script is used primarily in ancient texts and scholarly publications, so we exclude it.
        "NotoSansSyriac",
        # Western Syriac is used by Western Neo-Aramaic which is spoken by two villages in Western Syria.
        # c.f. https://en.wikipedia.org/wiki/Western_Neo-Aramaic
        # We exclude it as it is not widely used, and instead leave only the Eastern Syriac script.
        "NotoSansSyriacWestern",
        # Vithkuqi is an extinct alphabet used for the Albanian language. It was used in the 19th century and is no longer in use.
        # https://en.wikipedia.org/wiki/Vithkuqi_alphabet
        "NotoSansVithkuqi",
        # This font is a test font, so we exclude it
        "NotoSansTest",
    ]
)

KEY_REF = "ref"
KEY_FONTS = "fonts"

WEIGHTS = ["Regular", "SemiBold", "Bold"]

FONT_MANIFEST = MANIFEST[KEY_FONTS]


TTF_PATH = os.path.join(FONTS_SOURCE, "sources")

# Github API object keys
GH_PATH = "path"

# filename and directory patterns
HINTED_PATH_PATTERN = r"^fonts\/[^\/]+\/hinted\/ttf\/(NotoSans\w*)-\w*.ttf$"

VARIABLE_SLIM_LINE_PATTERN = (
    r"^fonts/[^/]+\/unhinted\/variable-ttf\/(NotoSans\w*)\[\w*\].ttf$"
)

VARIABLE_PATTERN = (
    r"^fonts/[^/]+\/unhinted\/slim-variable-ttf\/(NotoSans\w*)\[\w*\].ttf$"
)

WEIGHT_REGEXES = [re.compile(f"^(NotoSans\\w*)-{weight}\\.ttf$") for weight in WEIGHTS]

DOWNLOAD_URL = (
    "https://raw.githubusercontent.com/notofonts/notofonts.github.io/{ref}/{path}"
)


def _request(path):
    url = "https://api.github.com/repos/notofonts/notofonts.github.io/" + path
    token = os.environ.get("GITHUB_TOKEN")
    headers = {"Authorization": "token {}".format(token)} if token else {}
    r = requests.get(url, headers=headers)
    if r.status_code == 403:
        logging.error("You've hit the Github API rate limit.")
        if not token:
            logging.info(
                "You can set a GITHUB_TOKEN environment variable with a github API token.\n"
                + "Generate a github token at https://github.com/settings/tokens and give it read-only permission."
            )
        sys.exit(1)
    else:
        r.raise_for_status()
    return r.json()


def _is_base_font(name):
    """
    Used to filter out some special variants that we don't need
    """
    MODIFIERS = ["Display", "Mono", "Slanted"]
    for m in MODIFIERS:
        if name.endswith(m):
            return False
    return True


@utils.memoize
def _get_fixed_weight_fonts(recursive_tree):
    file_paths = [
        item["path"]
        for item in recursive_tree["tree"]
        if re.match(HINTED_PATH_PATTERN, item["path"])
    ]

    # Accumulate dicts of github info objects for font weights
    fixed_weight_fonts = {}
    for weight in WEIGHTS:
        fixed_weight_fonts[weight] = {}
    for file_path in file_paths:
        file_name = os.path.basename(file_path)
        for weight, regex in zip(WEIGHTS, WEIGHT_REGEXES):
            match = regex.match(file_name)
            if match and _is_base_font(match.group(1)):
                fixed_weight_fonts[weight][match.group(1)] = file_path
    return fixed_weight_fonts


@utils.memoize
def _get_variable_fonts(recursive_tree):
    font_names = {}
    for item in recursive_tree["tree"]:
        match = re.match(VARIABLE_PATTERN, item["path"])
        if match:
            font_names[match.group(1)] = item["path"]
    return font_names


@utils.memoize
def _get_variable_slim_fonts(recursive_tree):
    font_names = {}
    for item in recursive_tree["tree"]:
        match = re.match(VARIABLE_SLIM_LINE_PATTERN, item["path"])
        if match:
            font_names[match.group(1)] = item["path"]
    return font_names


def _get_all_typefaces(git_tree):
    fixed_weight_fonts = _get_fixed_weight_fonts(git_tree)
    variable_fonts = _get_variable_fonts(git_tree)
    variable_slim_fonts = _get_variable_slim_fonts(git_tree)

    # these are the fonts that have all weight variants or variable fonts
    all_typefaces = (
        reduce(and_, (set(v) for v in fixed_weight_fonts.values()))
        | set(variable_fonts.keys())
        | set(variable_slim_fonts.keys())
    )

    # remove UI variants as we will automatically pick these if available
    # also coerce to a list for dumping to JSON

    return {
        font_name
        for font_name in all_typefaces
        if not font_name.endswith("UI")
        and font_name not in EXCLUDED_TYPEFACES
        and _is_base_font(font_name)
    }


def _font_info(recursive_tree, ref):
    """
    Grab info on all relevant fonts. Returns a dict of objects generated by

    which contain a download URL for the all required font weights. Keys of the
    object are font base names, such as NotoSans or NotoSansArabic, keys of the sub dicts
    are the font weight name, such as Regular, SemiBold, Bold, or the Variable key.
    """
    fixed_weight_fonts = _get_fixed_weight_fonts(recursive_tree)
    variable_fonts = _get_variable_fonts(recursive_tree)
    variable_slim_fonts = _get_variable_slim_fonts(recursive_tree)

    # these are the fonts that have the needed weight variants
    all_typefaces = _get_all_typefaces(recursive_tree)

    # generate manifest objects, referring to the 'UI' variants when possible
    output = {}
    for font_name in all_typefaces:
        # for non-UI items, reference the UI variant when it exists
        if font_name + "UI" in all_typefaces:
            base_font_name = font_name + "UI"
        else:
            base_font_name = font_name

        output[font_name] = {}
        for weight in WEIGHTS:
            if base_font_name in fixed_weight_fonts[weight]:
                output[font_name][weight] = DOWNLOAD_URL.format(
                    ref=ref, path=fixed_weight_fonts[weight][base_font_name]
                )
            elif base_font_name in variable_slim_fonts:
                output[font_name]["Variable"] = DOWNLOAD_URL.format(
                    ref=ref, path=variable_slim_fonts[base_font_name]
                )
            elif base_font_name in variable_fonts:
                output[font_name]["Variable"] = DOWNLOAD_URL.format(
                    ref=ref, path=variable_fonts[base_font_name]
                )

    return output


def update_manifest(ref=None):
    """
    Given a git reference in the Noto repo, such as a git commit hash or tag, extract
    information about the fonts available for use and save that information to the
    manifest file.

    Noto contains both standard and "UI" variants of many fonts. When a font has a
    UI variant, it means that some of the glyphs in the standard variant are very tall
    and might overflow a typical line of text; the UI variant has the glypsh redrawn
    to fit.

    When searching for fonts to include, we take all language fonts that have both a
    regular and a bold variant, with preference given to Phase 3 and UI variants.
    """

    # grab the head of main
    if not ref:
        logging.info("Using head of main")
        ref = _request("git/refs/heads/main")["object"]["sha"]

    logging.info("Generating new manifest for reference '{}'".format(ref))

    git_tree = _request("git/trees/{}?recursive=1".format(ref))
    font_info = _font_info(git_tree, ref)

    new_manifest = {KEY_REF: ref, KEY_FONTS: font_info}
    utils.json_dump_formatted(new_manifest, FONT_MANIFEST_PATH)


def show_typefaces(ref=None):
    """
    Given a git reference in the Noto repo, such as a git commit hash or tag, extract
    information about the typefaces available for use and log.

    Noto contains both standard and "UI" variants of many fonts. When a font has a
    UI variant, it means that some of the glyphs in the standard variant are very tall
    and might overflow a typical line of text; the UI variant has the glyphs redrawn
    to fit.
    """

    # grab the head of main
    if not ref:
        logging.info("Using head of main")
        ref = _request("git/refs/heads/main")["object"]["sha"]

    logging.info("Generating new manifest for reference '{}'".format(ref))

    git_tree = _request("git/trees/{}?recursive=1".format(ref))
    typefaces = _get_all_typefaces(git_tree)

    for typeface in sorted(typefaces):
        logging.info(typeface)

    if EXCLUDED_TYPEFACES:
        logging.info("Excluded typefaces:")

        for typeface in sorted(EXCLUDED_TYPEFACES):
            logging.info(typeface)
    else:
        logging.info("No excluded typefaces")


def fetch_fonts():
    """
    download ttf files from the manifest
    """

    if not os.path.exists(TTF_PATH):
        os.makedirs(TTF_PATH)

    # out with the old
    for file_name in os.listdir(TTF_PATH):
        os.unlink(os.path.join(TTF_PATH, file_name))

    # in with the new
    for font_name in FONT_MANIFEST:
        font_info = FONT_MANIFEST[font_name]
        for weight in WEIGHTS:
            output_path = get_path(font_name, weight)
            logging.info("Writing {}".format(output_path))
            if weight in font_info:
                r = requests.get(font_info[weight])
                r.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(r.content)
            else:
                # If not found, use the variable font
                r = requests.get(font_info["Variable"])
                r.raise_for_status()
                font_stream = BytesIO(r.content)
                font = TTFont(font_stream)
                for instance in font["fvar"].instances:
                    name = font["name"].getDebugName(instance.subfamilyNameID)
                    if name == weight:
                        instancer.instantiateVariableFont(
                            font, instance.coordinates, inplace=True
                        )
                        break
                else:
                    # No named font, so set the weight specifically
                    instancer.instantiateVariableFont(font, {"wght": 600}, inplace=True)
                font.save(output_path)


@utils.memoize
def get_path(font_name, weight):
    return os.path.join(TTF_PATH, "{}-{}.ttf".format(font_name, weight))
