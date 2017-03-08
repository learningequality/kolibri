"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentNode
"""
from __future__ import print_function

import uuid
from gettext import gettext as _

from django.core.urlresolvers import reverse
from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from django.utils.text import get_valid_filename
from le_utils.constants import content_kinds, file_formats, format_presets
from mptt.models import MPTTModel, TreeForeignKey

from .content_db_router import get_active_content_database, get_content_database_connection
from .utils import paths

PRESET_LOOKUP = dict(format_presets.choices)


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


class ContentQuerySet(models.QuerySet):
    """
    Ensure proper database routing happens even when queryset is evaluated lazily outside of `using_content_database`.
    """
    def __init__(self, *args, **kwargs):
        kwargs["using"] = kwargs.get("using", None) or get_active_content_database(return_none_if_not_set=True)
        super(ContentQuerySet, self).__init__(*args, **kwargs)


class ContentDatabaseModel(models.Model):
    """
    All models that exist in content databases (rather than in the default database) should inherit from this class.
    """
    class Meta:
        abstract = True


@python_2_unicode_compatible
class ContentTag(ContentDatabaseModel):
    id = UUIDField(primary_key=True)
    tag_name = models.CharField(max_length=30, blank=True)

    objects = ContentQuerySet.as_manager()

    def __str__(self):
        return self.tag_name


@python_2_unicode_compatible
class ContentNode(MPTTModel, ContentDatabaseModel):
    """
    The top layer of the contentDB schema, defines the most common properties that are shared across all different contents.
    Things it can represent are, for example, video, exercise, audio or document...
    """
    id = UUIDField(primary_key=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    license = models.ForeignKey('License', null=True, blank=True)
    has_prerequisite = models.ManyToManyField('self', related_name='prerequisite_for', symmetrical=False, blank=True)
    related = models.ManyToManyField('self', symmetrical=True, blank=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)

    title = models.CharField(max_length=200)

    # the content_id is used for tracking a user's interaction with a piece of
    # content, in the face of possibly many copies of that content. When a user
    # interacts with a piece of content, all substantially similar pieces of
    # content should be marked as such as well. We track these "substantially
    # similar" types of content by having them have the same content_id.
    content_id = UUIDField()

    description = models.CharField(max_length=400, blank=True, null=True)
    sort_order = models.FloatField(blank=True, null=True)
    license_owner = models.CharField(max_length=200, blank=True)
    author = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=200, choices=content_kinds.choices, blank=True)
    available = models.BooleanField(default=False)
    stemmed_metaphone = models.CharField(max_length=1800, blank=True)  # for fuzzy search in title and description

    objects = ContentQuerySet.as_manager()

    class Meta:
        ordering = ('sort_order',)

    def __str__(self):
        return self.title

    def get_descendant_content_ids(self):
        """
        Retrieve a queryset of unique content_ids for non-topic content nodes that are
        descendants of this node.
        """
        return ContentNode.objects \
            .filter(lft__gte=self.lft, lft__lte=self.rght) \
            .exclude(kind=content_kinds.TOPIC) \
            .values_list("content_id", flat=True) \
            .distinct().order_by("content_id")

    def get_descendant_kind_counts(self):
        """ Return a dict mapping content kinds to counts, indicating how many descendant nodes there are of that kind.
        (Note: descendant nodes with identical content_id's are only counted once)"""
        # build a queryset of all non-topic descendant nodes
        descendants = ContentNode.objects.filter(lft__gte=self.lft, lft__lte=self.rght).exclude(kind="'{}'".format(content_kinds.TOPIC))
        # extract the unique pairs of content_id and kind, as a queryset
        unique_content_id_kinds = descendants.values("content_id", "kind").order_by("content_id", "kind").distinct().values("kind")
        # construct and execute a SQL query to count the number of nodes with unique content_ids for each kind
        query = 'SELECT "kind", COUNT(kind) as count FROM ({}) GROUP BY kind'.format(str(unique_content_id_kinds.query))
        conn = get_content_database_connection(self._state.db)
        # turn the results into a dict, mapping kind into unique count
        return dict(conn.execute(query))


@python_2_unicode_compatible
class Language(ContentDatabaseModel):
    id = models.CharField(max_length=7, primary_key=True)
    lang_code = models.CharField(max_length=3, db_index=True)
    lang_subcode = models.CharField(max_length=3, db_index=True, blank=True, null=True)

    objects = ContentQuerySet.as_manager()

    def __str__(self):
        return self.lang_code


@python_2_unicode_compatible
class File(ContentDatabaseModel):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    id = UUIDField(primary_key=True)
    checksum = models.CharField(max_length=400, blank=True)
    extension = models.CharField(max_length=40, choices=file_formats.choices, blank=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)
    contentnode = models.ForeignKey(ContentNode, related_name='files', blank=True, null=True)
    preset = models.CharField(max_length=150, choices=format_presets.choices, blank=True)
    lang = models.ForeignKey(Language, blank=True, null=True)
    supplementary = models.BooleanField(default=False)
    thumbnail = models.BooleanField(default=False)
    priority = models.IntegerField(blank=True, null=True)

    objects = ContentQuerySet.as_manager()

    class Meta:
        ordering = ["priority"]

    class Admin:
        pass

    def __str__(self):
        return '{checksum}{extension}'.format(checksum=self.checksum, extension='.' + self.extension)

    def get_filename(self):
        return "{}.{}".format(self.checksum, self.extension)

    def get_storage_url(self):
        """
        Return a url for the client side to retrieve the content file.
        The same url will also be exposed by the file serializer.
        """
        if self.available:
            return paths.get_content_storage_file_url(filename=self.get_filename(), baseurl="/")
        else:
            return None

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
        filename = "{} ({}).{}".format(title, self.get_preset(), self.extension)
        valid_filename = get_valid_filename(filename)
        return valid_filename

    def get_download_url(self):
        """
        Return the download url.
        """
        new_filename = self.get_download_filename()
        return reverse('downloadcontent', kwargs={'filename': self.get_filename(), 'new_filename': new_filename})


@python_2_unicode_compatible
class License(ContentDatabaseModel):
    """
    Normalize the license of ContentNode model
    """
    license_name = models.CharField(max_length=50)

    objects = ContentQuerySet.as_manager()

    def __str__(self):
        return self.license_name


@python_2_unicode_compatible
class ChannelMetadataAbstractBase(models.Model):
    """
    Holds metadata about all existing content databases that exist locally.
    """
    id = UUIDField(primary_key=True)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    author = models.CharField(max_length=400, blank=True)
    version = models.IntegerField(default=0)
    thumbnail = models.TextField(blank=True)
    root_pk = UUIDField()

    class Meta:
        abstract = True

    def __str__(self):
        return self.name


class ChannelMetadata(ChannelMetadataAbstractBase, ContentDatabaseModel):
    """
    This class stores the channel metadata within the content database itself.
    """

    objects = ContentQuerySet.as_manager()


class ChannelMetadataCache(ChannelMetadataAbstractBase):
    """
    This class stores the channel metadata cached/denormed into the primary database.
    """

    class Admin:
        pass
