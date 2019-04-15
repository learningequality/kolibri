"""
These models are used in the databases of content that get imported from Studio.


*DEVELOPER WARNING regarding updates to these models*

If you modify the schema here, it has implications for the content import pipeline
because other systems also read and write these databases.

Specifically, Kolibri Studio has a modified version of this models.py for generating
backwards-compatible content databases. Changes made here should be propagated to Studio
in order to allow for generation of databases with the updated schema.

In order to track updates to models or fields, the CONTENT_SCHEMA_VERSION value must be
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

A pickled SQLAlchemy schema for the new schema must also be generated using the
generate_schema management command. This must be generated using an empty, migrated
database.

The 'version' parameter passed to the command should be the value of e.g. VERSION_3:

    `kolibri manage generate_schema 3`

All pickled schema should be registered in the CONTENT_DB_SCHEMA_VERSIONS list in
this file e.g. VERSION_3 should be added to the list.

The channel import test classes for the previous schema should also be added in
./test/test_channel_import.py - it should inherit from the NaiveImportTestCase, and set the
name property to the previous CONTENT_SCHEMA_VERSION e.g. VERSION_2.
"""
from __future__ import print_function

import os
import uuid
from gettext import gettext as _

from django.core.urlresolvers import reverse
from django.db import connection
from django.db import models
from django.db.models import Min
from django.utils.encoding import python_2_unicode_compatible
from django.utils.text import get_valid_filename
from jsonfield import JSONField
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants.languages import LANGUAGE_DIRECTIONS
from mptt.managers import TreeManager
from mptt.models import MPTTModel
from mptt.models import TreeForeignKey
from mptt.querysets import TreeQuerySet

from .utils import paths
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.conf import OPTIONS

PRESET_LOOKUP = dict(format_presets.choices)

V020BETA1 = 'v0.2.0-beta1'

V040BETA3 = 'v0.4.0-beta3'

NO_VERSION = 'unversioned'

VERSION_1 = '1'

VERSION_2 = '2'

# List of the content db schema versions, ordered from most recent to least recent.
# When a new schema version is generated, it should be added here, at the top of the list.
CONTENT_DB_SCHEMA_VERSIONS = [
    VERSION_2,
    VERSION_1,
    NO_VERSION,
    V040BETA3,
    V020BETA1,
]

# The schema version for this version of Kolibri
CONTENT_SCHEMA_VERSION = VERSION_2


class UUIDField(models.CharField):
    """
    Adaptation of Django's UUIDField, but with 32-char hex representation as Python representation rather than a UUID instance.
    """

    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 32
        super(UUIDField, self).__init__(*args, **kwargs)

    def prepare_value(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value

    def deconstruct(self):
        name, path, args, kwargs = super(UUIDField, self).deconstruct()
        del kwargs['max_length']
        return name, path, args, kwargs

    def get_internal_type(self):
        return "UUIDField"

    def get_db_prep_value(self, value, connection, prepared=False):
        if value is None:
            return None
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except AttributeError:
                raise TypeError(self.error_messages['invalid'] % {'value': value})
        return value.hex

    def from_db_value(self, value, expression, connection, context):
        return self.to_python(value)

    def to_python(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value


@python_2_unicode_compatible
class ContentTag(models.Model):
    id = UUIDField(primary_key=True)
    tag_name = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return self.tag_name


class ContentNodeQueryset(TreeQuerySet):

    def dedupe_by_content_id(self):
        # remove duplicate content nodes based on content_id
        if connection.vendor == "sqlite":
            # adapted from https://code.djangoproject.com/ticket/22696
            deduped_ids = self.values('content_id').annotate(node_id=Min('id')).values_list('node_id', flat=True)
            return self.filter(id__in=deduped_ids)

        # when using postgres, we can call distinct on a specific column
        elif connection.vendor == "postgresql":
            return self.order_by('content_id').distinct('content_id')


class ContentNodeManager(models.Manager.from_queryset(ContentNodeQueryset), TreeManager):

    def get_queryset(self, *args, **kwargs):
        """
        Ensures that this manager always returns nodes in tree order.
        """
        return super(TreeManager, self).get_queryset(
            *args, **kwargs
        ).order_by(
            self.tree_id_attr, self.left_attr
        )


@python_2_unicode_compatible
class ContentNode(MPTTModel):
    """
    The primary object type in a content database. Defines the properties that are shared
    across all content types.

    It represents videos, exercises, audio, documents, and other 'content items' that
    exist as nodes in content channels.
    """
    id = UUIDField(primary_key=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    license_name = models.CharField(max_length=50, null=True, blank=True)
    license_description = models.TextField(null=True, blank=True)
    has_prerequisite = models.ManyToManyField('self', related_name='prerequisite_for', symmetrical=False, blank=True)
    related = models.ManyToManyField('self', symmetrical=True, blank=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
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
    stemmed_metaphone = models.CharField(max_length=1800, blank=True)  # for fuzzy search in title and description
    lang = models.ForeignKey('Language', blank=True, null=True)

    objects = ContentNodeManager()

    class Meta:
        ordering = ('lft',)
        index_together = [
            ["level", "channel_id", "kind"],
            ["level", "channel_id", "available"],
        ]

    def __str__(self):
        return self.title

    def get_descendant_content_ids(self):
        """
        Retrieve a queryset of content_ids for non-topic content nodes that are
        descendants of this node.
        """
        return ContentNode.objects \
            .filter(lft__gte=self.lft, lft__lte=self.rght) \
            .exclude(kind=content_kinds.TOPIC) \
            .values_list("content_id", flat=True)


@python_2_unicode_compatible
class Language(models.Model):
    id = models.CharField(max_length=14, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=10, db_index=True, blank=True, null=True)
    # Localized name
    lang_name = models.CharField(max_length=100, blank=True, null=True)
    lang_direction = models.CharField(max_length=3, choices=LANGUAGE_DIRECTIONS, default=LANGUAGE_DIRECTIONS[0][0])

    def __str__(self):
        return self.lang_name or ''


class File(models.Model):
    """
    The second to bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    id = UUIDField(primary_key=True)
    # The foreign key mapping happens here as many File objects can map onto a single local file
    local_file = models.ForeignKey('LocalFile', related_name='files')
    available = models.BooleanField(default=False)
    contentnode = models.ForeignKey(ContentNode, related_name='files')
    preset = models.CharField(max_length=150, choices=format_presets.choices, blank=True)
    lang = models.ForeignKey(Language, blank=True, null=True)
    supplementary = models.BooleanField(default=False)
    thumbnail = models.BooleanField(default=False)
    priority = models.IntegerField(blank=True, null=True, db_index=True)

    class Meta:
        ordering = ["priority"]

    class Admin:
        pass

    def get_extension(self):
        return self.local_file.extension

    def get_file_size(self):
        return self.local_file.file_size

    def get_storage_url(self):
        return self.local_file.get_storage_url()

    def get_preset(self):
        """
        Return the preset.
        """
        return PRESET_LOOKUP.get(self.preset, _('Unknown format'))

    def get_download_filename(self):
        """
        Return a valid filename to be downloaded as.
        """
        title = self.contentnode.title
        filename = "{} ({}).{}".format(title, self.get_preset(), self.get_extension())
        valid_filename = get_valid_filename(filename)
        return valid_filename

    def get_download_url(self):
        """
        Return the download url.
        """
        new_filename = self.get_download_filename()
        return reverse('kolibri:core:downloadcontent', kwargs={'filename': self.local_file.get_filename(), 'new_filename': new_filename})


class LocalFileManager(models.Manager):
    def delete_orphan_files(self):
        for file in self.filter(files__isnull=True):
            try:
                os.remove(paths.get_content_storage_file_path(file.get_filename()))
            except (IOError, OSError, InvalidStorageFilenameError,):
                pass
            yield file

    def get_orphan_files(self):
        return self.filter(files__isnull=True)

    def delete_orphan_file_objects(self):
        return self.get_orphan_files().delete()


@python_2_unicode_compatible
class LocalFile(models.Model):
    """
    The bottom layer of the contentDB schema, defines the local state of files on the device storage.
    """
    # ID should be the checksum of the file
    id = models.CharField(max_length=32, primary_key=True)
    extension = models.CharField(max_length=40, choices=file_formats.choices, blank=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)

    objects = LocalFileManager()

    class Admin:
        pass

    def __str__(self):
        return paths.get_content_file_name(self)

    def get_filename(self):
        return self.__str__()

    def get_storage_url(self):
        """
        Return a url for the client side to retrieve the content file.
        The same url will also be exposed by the file serializer.
        """
        if self.available:
            return paths.get_content_storage_file_url(filename=self.get_filename(), baseurl=OPTIONS['Deployment']['URL_PATH_PREFIX'])
        else:
            return None


class AssessmentMetaData(models.Model):
    """
    A model to describe additional metadata that characterizes assessment behaviour in Kolibri.
    This model contains additional fields that are only revelant to content nodes that probe a
    user's state of knowledge and allow them to practice to Mastery.
    ContentNodes with this metadata may also be able to be used within quizzes and exams.
    """
    id = UUIDField(primary_key=True)
    contentnode = models.ForeignKey(
        ContentNode, related_name='assessmentmetadata'
    )
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


@python_2_unicode_compatible
class ChannelMetadata(models.Model):
    """
    Holds metadata about all existing content databases that exist locally.
    """
    id = UUIDField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    author = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True)
    last_updated = DateTimeTzField(null=True)
    # Minimum version of Kolibri that this content database is compatible with
    min_schema_version = models.CharField(max_length=50)
    root = models.ForeignKey(ContentNode)
    # precalculated fields during annotation/migration
    published_size = models.BigIntegerField(default=0, null=True, blank=True)
    total_resource_count = models.IntegerField(default=0, null=True, blank=True)
    included_languages = models.ManyToManyField(
        "Language",
        related_name='channels',
        verbose_name="languages",
        blank=True,
    )
    order = models.PositiveIntegerField(default=0, null=True, blank=True)

    class Admin:
        pass

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name

    def delete_content_tree_and_files(self):
        # Use Django ORM to ensure cascading delete:
        self.root.delete()
        ContentCacheKey.update_cache_key()
