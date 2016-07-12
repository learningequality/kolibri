"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentNode
"""
from __future__ import print_function

from django.conf import settings
from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from mptt.models import MPTTModel, TreeForeignKey

from .constants import content_kinds, extensions, presets
from .content_db_router import get_active_content_database


class UUIDField(models.CharField):

    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 32
        super(UUIDField, self).__init__(*args, **kwargs)


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

    objects = ContentQuerySet.as_manager()

    def __str__(self):
        return self.title


@python_2_unicode_compatible
class Language(ContentDatabaseModel):
    lang_code = models.CharField(max_length=2, db_index=True)
    lang_subcode = models.CharField(max_length=2, db_index=True)

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
    extension = models.CharField(max_length=40, choices=extensions.choices, blank=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)
    contentnode = models.ForeignKey(ContentNode, related_name='files', blank=True, null=True)
    preset = models.CharField(max_length=150, choices=presets.choices, blank=True)
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

    def get_url(self):
        """
        Return a url for the client side to retrieve the content file.
        The same url will also be exposed by the file serializer
        """
        if self.available:
            return settings.CONTENT_STORAGE_URL + self.checksum[0] + '/' + self.checksum[1] + '/' + self.checksum + '.' + self.extension
        else:
            return None


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
