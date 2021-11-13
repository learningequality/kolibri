"""
This file contains abstract models that form the basis for
models that are used within Kolibri to track content metadata
and are also used within Kolibri Studio to prepare content metadata
for export

These models are used in the databases of content that get imported from Studio.

*DEVELOPER WARNING regarding updates to these models*

If you modify the schema here, it has implications for the content import pipeline
because other systems also read and write these databases.

Specifically, Kolibri Studio has a modified version of this models.py for generating
backwards-compatible content databases. Changes made here should be propagated to Studio
in order to allow for generation of databases with the updated schema.

However, in the case where the modifications are intended only within Kolibri, such
as fields that provide a local record of expensive to compute properties, these do
not need to be added to an importable schema version (and will not be used in Studio).
To make updates to fields with this purpose, please use the models defined in the main
models.py in this module.

To faciltitate importing from different versions of exported channel databases
a SQLAlchemy schema for the new schema must be generated using the
generate_schema management command.

In the case where no updates have yet been made to the schema_versions constants,
the command can be run without arguments, and it will auto increment:

    `kolibri manage generate_schema`

If the schema_versions file has already been updated, then the 'version' parameter
passed to the command should be the value of the new version e.g. VERSION_3:

    `kolibri manage generate_schema 3`

Note that in both these cases the current schema that is used for doing
SQLAlchemy operations on the default Django database will also be updated.

In order to track updates to models or fields, the CONTENT_SCHEMA_VERSION value in
kolibri/core/content/constants/schema_versions.py must be
incremented, with an additional constant added for the new version.
E.g. a new constant VERSION_3 = '3', might be added, and CONTENT_SCHEMA_VERSION set to
VERSION_3.

In addition, the new constant should be added to the mappings dict in
./utils/channel_import.py with an appropriate ChannelImport class associated.
This map associates content schema versions with associated ChannelImport classes,
which allows proper importing of that content database into the current content schema
for Kolibri.

If the new schema requires inference of the field when it is missing from old databases
(i.e. it does not have a default value, or cannot be null or blank), then all the
ChannelImport classes for previous versions must be updated to infer this data from old
databases.

All schema should be registered in the CONTENT_DB_SCHEMA_VERSIONS list in
this file e.g. VERSION_3 should be added to the list.

The channel import test classes for the previous schema should also be added in
./test/test_channel_import.py - it should inherit from the NaiveImportTestCase, and set the
name property to the previous CONTENT_SCHEMA_VERSION e.g. VERSION_2.

If fields are being removed or entire models deleted from this file, they should be copied
into legacy_models.py to allow for referencing during channel import of older databases.
"""
from __future__ import print_function

from django.db import models
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants.languages import LANGUAGE_DIRECTIONS
from morango.models import UUIDField
from mptt.models import MPTTModel
from mptt.models import TreeForeignKey

from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import JSONField


class ContentTag(models.Model):
    id = UUIDField(primary_key=True)
    tag_name = models.CharField(max_length=30, blank=True)

    class Meta:
        abstract = True


class ContentNode(MPTTModel):
    """
    The primary object type in a content database. Defines the properties that are shared
    across all content types.

    It represents videos, exercises, audio, documents, and other 'content items' that
    exist as nodes in content channels.
    """

    id = UUIDField(primary_key=True)
    parent = TreeForeignKey(
        "self", null=True, blank=True, related_name="children", db_index=True
    )
    license_name = models.CharField(max_length=50, null=True, blank=True)
    license_description = models.TextField(null=True, blank=True)
    has_prerequisite = models.ManyToManyField(
        "self", related_name="prerequisite_for", symmetrical=False, blank=True
    )
    related = models.ManyToManyField("self", symmetrical=True, blank=True)
    tags = models.ManyToManyField(
        "ContentTag", symmetrical=False, related_name="tagged_content", blank=True
    )
    title = models.CharField(max_length=200)
    coach_content = models.BooleanField(default=False)

    # the content_id is used for tracking a user's interaction with a piece of
    # content, in the face of possibly many copies of that content. When a user
    # interacts with a piece of content, all substantially similar pieces of
    # content should be marked as such as well. We track these "substantially
    # similar" types of content by having them have the same content_id.
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField(db_index=True)

    description = models.TextField(blank=True, null=True)
    sort_order = models.FloatField(blank=True, null=True)
    license_owner = models.CharField(max_length=200, blank=True)
    author = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=200, choices=content_kinds.choices, blank=True)
    available = models.BooleanField(default=False)
    lang = models.ForeignKey("Language", blank=True, null=True)

    # A JSON Dictionary of properties to configure loading, rendering, etc. the file
    options = JSONField(default={}, blank=True, null=True)

    # Fields for metadata labels
    grade_levels = models.TextField(blank=True, null=True)
    resource_types = models.TextField(blank=True, null=True)
    learning_activities = models.TextField(blank=True, null=True)
    accessibility_labels = models.TextField(blank=True, null=True)
    categories = models.TextField(blank=True, null=True)
    learner_needs = models.TextField(blank=True, null=True)

    # The (suggested) duration of a resource, in seconds.
    duration = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        abstract = True


class Language(models.Model):
    id = models.CharField(max_length=14, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=10, db_index=True, blank=True, null=True)
    # Localized name
    lang_name = models.CharField(max_length=100, blank=True, null=True)
    lang_direction = models.CharField(
        max_length=3, choices=LANGUAGE_DIRECTIONS, default=LANGUAGE_DIRECTIONS[0][0]
    )

    class Meta:
        abstract = True


class File(models.Model):
    """
    The second to bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """

    id = UUIDField(primary_key=True)
    # The foreign key mapping happens here as many File objects can map onto a single local file
    local_file = models.ForeignKey("LocalFile", related_name="files")
    contentnode = models.ForeignKey("ContentNode", related_name="files")
    preset = models.CharField(
        max_length=150, choices=format_presets.choices, blank=True
    )
    lang = models.ForeignKey("Language", blank=True, null=True)
    supplementary = models.BooleanField(default=False)
    thumbnail = models.BooleanField(default=False)
    priority = models.IntegerField(blank=True, null=True, db_index=True)

    class Meta:
        abstract = True


class LocalFile(models.Model):
    """
    The bottom layer of the contentDB schema, defines the local state of files on the device storage.
    """

    # ID should be the checksum of the file
    id = models.CharField(max_length=32, primary_key=True)
    extension = models.CharField(
        max_length=40, choices=file_formats.choices, blank=True
    )
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)

    class Meta:
        abstract = True


class AssessmentMetaData(models.Model):
    """
    A model to describe additional metadata that characterizes assessment behaviour in Kolibri.
    This model contains additional fields that are only revelant to content nodes that probe a
    user's state of knowledge and allow them to practice to Mastery.
    ContentNodes with this metadata may also be able to be used within quizzes and exams.
    """

    id = UUIDField(primary_key=True)
    contentnode = models.ForeignKey("ContentNode", related_name="assessmentmetadata")
    # A JSON blob containing a serialized list of ids for questions that the assessment can present.
    assessment_item_ids = JSONField(default=[])
    # Length of the above assessment_item_ids for a convenience lookup.
    number_of_assessments = models.IntegerField()
    # A JSON blob describing the mastery model that is used to set this assessment as mastered.
    mastery_model = JSONField(default={})
    # Should the questions listed in assessment_item_ids be presented in a random order?
    randomize = models.BooleanField(default=False)
    # Is this assessment compatible with being previewed and answer filled for display in coach reports
    # and use in summative and formative tests?
    is_manipulable = models.BooleanField(default=False)

    class Meta:
        abstract = True


class ChannelMetadata(models.Model):
    """
    Holds metadata about all existing content databases that exist locally.
    """

    id = UUIDField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    tagline = models.CharField(max_length=150, blank=True, null=True)
    author = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True)
    last_updated = DateTimeTzField(null=True)
    # Minimum version of Kolibri that this content database is compatible with
    min_schema_version = models.CharField(max_length=50)
    root = models.ForeignKey("ContentNode")

    class Meta:
        abstract = True
