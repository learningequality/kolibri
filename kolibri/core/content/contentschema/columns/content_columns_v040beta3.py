"""
Frozen column map for content schema version v0.4.0-beta3.

Written by `kolibri manage generate_schema` — do not edit by hand.
"""

COLUMNS = {
    "content_assessmentmetadata": (
        "id",
        "assessment_item_ids",
        "number_of_assessments",
        "mastery_model",
        "randomize",
        "is_manipulable",
        "contentnode_id",
    ),
    "content_channelmetadata": (
        "id",
        "name",
        "description",
        "author",
        "version",
        "thumbnail",
        "root_pk",
    ),
    "content_contentnode": (
        "id",
        "title",
        "content_id",
        "description",
        "sort_order",
        "license_owner",
        "author",
        "kind",
        "available",
        "stemmed_metaphone",
        "lft",
        "rght",
        "tree_id",
        "level",
        "license_id",
        "parent_id",
    ),
    "content_contentnode_has_prerequisite": (
        "id",
        "from_contentnode_id",
        "to_contentnode_id",
    ),
    "content_contentnode_related": ("id", "from_contentnode_id", "to_contentnode_id"),
    "content_contentnode_tags": ("id", "contentnode_id", "contenttag_id"),
    "content_contenttag": ("id", "tag_name"),
    "content_file": (
        "id",
        "checksum",
        "extension",
        "available",
        "file_size",
        "preset",
        "supplementary",
        "thumbnail",
        "priority",
        "contentnode_id",
        "lang_id",
    ),
    "content_language": ("id", "lang_code", "lang_subcode"),
    "content_license": ("id", "license_name", "license_description"),
}
