# Mapping of integer IDs to KDS icon names for picture-based login.
#
# IMPORTANT — treat this mapping as an append-only registry:
#   • IDs are immutable once assigned.
#   • Pictures can be added but NEVER removed or reassigned.
#   • Changing or removing an ID would invalidate stored sequences
#     or silently point them to the wrong picture.
#
# This object should be kept in sync with PICTURE_PASSWORD_SET
# in packages/kolibri/constants.js.

PICTURE_PASSWORD_SET = {
    1: {
        "icon_colorful": "beeColorful",
        "icon_standard": "beeStandard",
    },
    2: {
        "icon_colorful": "starColorful",
        "icon_standard": "starStandard",
    },
    3: {
        "icon_colorful": "moonColorful",
        "icon_standard": "moonStandard",
    },
    4: {
        "icon_colorful": "treeColorful",
        "icon_standard": "treeStandard",
    },
    5: {
        "icon_colorful": "leafColorful",
        "icon_standard": "leafStandard",
    },
    6: {
        "icon_colorful": "mouseColorful",
        "icon_standard": "mouseStandard",
    },
    7: {
        "icon_colorful": "waterColorful",
        "icon_standard": "waterStandard",
    },
    8: {
        "icon_colorful": "fishColorful",
        "icon_standard": "fishStandard",
    },
    9: {
        "icon_colorful": "dogColorful",
        "icon_standard": "dogStandard",
    },
    10: {
        "icon_colorful": "smileColorful",
        "icon_standard": "smileStandard",
    },
    11: {
        "icon_colorful": "flowerColorful",
        "icon_standard": "flowerStandard",
    },
    12: {
        "icon_colorful": "birdColorful",
        "icon_standard": "birdStandard",
    },
}
