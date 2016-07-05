"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentNode
"""
from __future__ import print_function

import uuid

from django.conf import settings
from django.db import IntegrityError, models
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
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    license = models.ForeignKey('License')
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of', through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship', symmetrical=False, blank=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)

    title = models.CharField(max_length=200)

    # the instance_id is used for mapping a node between kolibri and the
    # content curation server. We can't use an auto-integer PK, since ids aren't
    # guaranteed to be consistent across different content curation servers
    # (once we have a distributed content curation server), and content ids may
    # be the same across different nodes within the same channel (for student
    # logging and analytics purposes.)
    instance_id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)

    # the content_id is used for tracking a user's interaction with a piece of
    # content, in the face of possibly many copies of that content. When a user
    # interacts with a piece of content, all substantially similar pieces of
    # content should be marked as such as well. We track these "substantially
    # similar" types of content by having them have the same content_id.
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)

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
            return settings.STORAGE_URL + self.checksum[0] + '/' + self.checksum[1] + '/' + self.checksum + '.' + self.extension
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


class PrerequisiteContentRelationship(ContentDatabaseModel):
    """
    Predefine the prerequisite relationship between two ContentNode objects.
    """
    target_node = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_target_node')
    prerequisite = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_prerequisite')

    objects = ContentQuerySet.as_manager()

    class Meta:
        unique_together = ['target_node', 'prerequisite']

    def clean(self, *args, **kwargs):
        # self reference exception
        if self.target_node == self.prerequisite:
            raise IntegrityError('Cannot self reference as prerequisite.')
        # immediate cyclic exception
        elif PrerequisiteContentRelationship.objects.using(self._state.db)\
                .filter(target_node=self.prerequisite, prerequisite=self.target_node):
            raise IntegrityError(
                'Note: Prerequisite relationship is directional! %s and %s cannot be prerequisite of each other!'
                % (self.target_node, self.prerequisite))
        # distant cyclic exception
        # elif <this is a nice to have exception, may implement in the future when the priority raises.>
        #     raise Exception('Note: Prerequisite relationship is acyclic! %s and %s forms a closed loop!' % (self.target_node, self.prerequisite))
        super(PrerequisiteContentRelationship, self).clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super(PrerequisiteContentRelationship, self).save(*args, **kwargs)


class RelatedContentRelationship(ContentDatabaseModel):
    """
    Predefine the related relationship between two ContentNode objects.
    """
    contentnode_1 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_1')
    contentnode_2 = models.ForeignKey(ContentNode, related_name='%(app_label)s_%(class)s_2')

    objects = ContentQuerySet.as_manager()

    class Meta:
        unique_together = ['contentnode_1', 'contentnode_2']

    def save(self, *args, **kwargs):
        # self reference exception
        if self.contentnode_1 == self.contentnode_2:
            raise IntegrityError('Cannot self reference as related.')
        # handle immediate cyclic
        elif RelatedContentRelationship.objects.using(self._state.db)\
                .filter(contentnode_1=self.contentnode_2, contentnode_2=self.contentnode_1):
            return  # silently cancel the save
        super(RelatedContentRelationship, self).save(*args, **kwargs)


@python_2_unicode_compatible
class ChannelMetadataAbstractBase(models.Model):
    """
    Provide references to the corresponding contentDB when navigate between channels.
    Every content API method needs a channel_id argument, which is stored in this model.
    """
    channel_id = UUIDField(primary_key=True)
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
