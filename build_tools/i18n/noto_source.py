import json
import logging
import os
import re
import sys

import requests
import utils

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


"""
    These utility functions allow us to maintain the noto source manifest file and
    download source files from Google's Github repos.
"""


# local paths
FONTS_SOURCE = os.path.abspath(os.path.join(os.path.dirname(__file__), "noto_source"))

FONT_MANIFEST_PATH = os.path.join(FONTS_SOURCE, "manifest.json")
with open(FONT_MANIFEST_PATH, "r") as mf:
    MANIFEST = json.load(mf)

KEY_REF = "ref"
KEY_FONTS = "fonts"
KEY_REG_URL = "reg_url"
KEY_BOLD_URL = "bold_url"

FONT_MANIFEST = MANIFEST[KEY_FONTS]


TTF_PATH = os.path.join(FONTS_SOURCE, "sources")

# Github API object keys
GH_NAME = "name"
GH_INFO_URL = "url"
GH_DL_URL = "download_url"
GH_SHA = "sha"
GH_TYPE = "type"
GH_TYPE_DIRECTORY = "dir"
GH_TYPE_FILE = "file"

# filename and directory patterns
DIRECTORY_PATTERN = "^NotoSans\w*$"
REG_PATTERN = "^(NotoSans\w*)-Regular\.ttf$"
BOLD_PATTERN = "^(NotoSans\w*)-Bold\.ttf$"


def _request(path, ref):
    """
    Request information from the Github API about a particular path and reference in
    the Google Noto repository.

    Note that if Google re-arranges their repo, updating to future references may no
    longer work as expected and the logic in these functions will need to be updated.
    """

    BASE_URL = "https://api.github.com/repos/googlei18n/noto-fonts/contents"
    url = "{}/{}?ref={}".format(BASE_URL, path, ref)
    token = os.environ.get("GITHUB_TOKEN")
    headers = {"Authorization": "token {}".format(token)} if token else {}
    r = requests.get(url, headers=headers)
    if r.status_code == 403:
        logging.error("You've hit the Github API rate limit.")
        if not token:
            logging.error(
                "To increase your limit, set a GITHUB_TOKEN environment variable with a github API token."
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


def _manifest_object(reg_url, bold_url):
    """
    Primary font record in the manifest
    """

    return {KEY_REG_URL: reg_url, KEY_BOLD_URL: bold_url}


def _invalid_dir(item):
    """
    Used to filter down to only potentially usable font subdirectories
    """

    if not re.match(pattern=DIRECTORY_PATTERN, string=item[GH_NAME]):
        return True
    if not _is_base_font(item[GH_NAME]):
        return True
    if item[GH_TYPE] != GH_TYPE_DIRECTORY:
        return True
    return False


def _phase_3_info(ref):
    """
    Grab info on all relevant phase 3 fonts
    """

    logging.info("Extracting info on Phase 3 fonts. This can take some time...")

    info_list = _request("phaseIII_only/hinted/ttf/", ref)

    # accumulate manifest objects for all seemingly valid fonts
    items = {}
    for item in info_list:
        if _invalid_dir(item):
            continue
        children = _request("phaseIII_only/hinted/ttf/" + item[GH_NAME], ref)
        reg = None
        bold = None
        for child in children:
            if re.match(pattern=REG_PATTERN, string=child[GH_NAME]):
                reg = child
            if re.match(pattern=BOLD_PATTERN, string=child[GH_NAME]):
                bold = child
        if not (reg and bold):
            continue
        items[item[GH_NAME]] = _manifest_object(reg[GH_DL_URL], bold[GH_DL_URL])

    # refer to the 'UI' variants when possible
    output = {}
    for font_name in items.keys():
        # skip UI variants because these will always have a normal variant too
        if font_name.endswith("UI"):
            continue
        # for non-UI items, reference the UI variant when it exists
        ui_item = items.get(font_name + "UI")
        if ui_item:
            output[font_name] = ui_item
        else:
            output[font_name] = items.get(font_name)

    return output


def _old_font_info(ref):
    """
    Grab info on all relevant older fonts
    """

    logging.info("Extracting info on older-style fonts")

    info_list = _request("hinted", ref)

    # Accumulate dicts of github info objects for regular and bold fonts
    reg_items = {}
    bold_items = {}
    for item in info_list:
        if item[GH_TYPE] != GH_TYPE_FILE:
            continue
        reg = re.match(pattern=REG_PATTERN, string=item[GH_NAME])
        bold = re.match(pattern=BOLD_PATTERN, string=item[GH_NAME])
        if reg:
            font_name = reg.group(1)
            if not _is_base_font(font_name):
                continue
            reg_items[font_name] = item
        elif bold:
            font_name = bold.group(1)
            if not _is_base_font(font_name):
                continue
            bold_items[font_name] = item

    # these are the fonts that have both regular and bold variants
    bold_and_reg = set(reg_items.keys()).intersection(bold_items.keys())

    # generate manifest objects, referring to the 'UI' variants when possible
    output = {}
    for font_name in bold_and_reg:
        # skip UI variants because these will always have a normal variant too
        if font_name.endswith("UI"):
            continue
        # for non-UI items, reference the UI variant when it exists
        if font_name + "UI" in bold_and_reg:
            file_name = font_name + "UI"
        else:
            file_name = font_name

        output[font_name] = _manifest_object(
            reg_items[file_name][GH_DL_URL], bold_items[file_name][GH_DL_URL]
        )

    return output


def update_manifest(ref):
    """
    Given a git reference in the Noto repo, such as a git commit hash or tag, extract
    information about the fonts available for use and save that information to the
    manifest file.

    The Noto repo currently contains both an older style and the newer "Phase 3"
    fonts. Phase 3 fonts have more consistent internal metrics which makes them amenable
    to being merged together, which we make use of. The older fonts are still usable,
    but cannot be merged together.

    Noto also contains both standard and "UI" variants of many fonts. When a font has a
    UI variant, it means that some of the glyphs in the standard variant are very tall
    and might overflow a typical line of text; the UI variant has the glypsh redrawn
    to fit.

    When searching for fonts to include, we take all language fonts that have both a
    regular and a bold variant, with preference given to Phase 3 and UI variants.
    """

    logging.info("Generating new manifest for reference '{}'".format(ref))

    font_info = _old_font_info(ref)  # backups
    font_info.update(_phase_3_info(ref))  # prefer phase 3

    new_manifest = {KEY_REF: ref, KEY_FONTS: font_info}
    utils.json_dump_formatted(new_manifest, FONT_MANIFEST_PATH)


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

        # regular
        output_path = get_path(font_name, False)
        logging.info("Writing {}".format(output_path))
        r = requests.get(font_info[KEY_REG_URL])
        with open(output_path, "wb") as f:
            f.write(r.content)

        # bold
        output_path = get_path(font_name, True)
        logging.info("Writing {}".format(output_path))
        r = requests.get(font_info[KEY_BOLD_URL])
        with open(output_path, "wb") as f:
            f.write(r.content)


@utils.memoize
def get_path(font_name, is_bold=False):
    info = FONT_MANIFEST[font_name]
    path = info[KEY_BOLD_URL] if is_bold else info[KEY_REG_URL]
    return os.path.join(TTF_PATH, os.path.basename(path))
