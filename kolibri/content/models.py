"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentMetadata
"""
from __future__ import print_function

import os
from uuid import uuid4

from django.conf import settings
from django.db import IntegrityError, OperationalError, connections, models
from django.db.utils import ConnectionDoesNotExist
from mptt.models import MPTTModel, TreeForeignKey

from .constants import extensions, kinds, presets

class ContentManager(models.Manager):
    pass

class ContentQuerySet(models.QuerySet):
    """
    Overrider QuerySet's using method to establish database conncetions at the first time that database is hitten.
    """
    def using(self, alias):
        try:
            connections[alias]
        except ConnectionDoesNotExist:
            connections.databases[alias] = {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(settings.CONTENT_DB_DIR, alias+'.sqlite3'),
            }
        try:
            if not connections[alias].introspection.table_names():
                raise KeyError("ContentDB '%s' is empty!!" % str(alias))
        except OperationalError:
            raise KeyError("ContentDB '%s' doesn't exist!!" % str(alias))
        return super(ContentQuerySet, self).using(alias)

class AbstractContent(models.Model):
    objects = ContentManager.from_queryset(ContentQuerySet)()

    class Meta:
        abstract = True

class ContentTag(AbstractContent):
    tag_name = models.CharField(max_length=30, null=True, blank=True)
    tag_type = models.CharField(max_length=30, null=True, blank=True)

    def __str__(self):
        return self.tag_name

class ContentMetadata(MPTTModel, AbstractContent):
    """
    The top layer of the contentDB schema, defines the most common properties that are shared across all different contents.
    Things it can represent are, for example, video, exercise, audio or document...
    """
    content_id = models.UUIDField(primary_key=False, default=uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    kind = models.ForeignKey('ContentKind', related_name='content_metadatas', blank=True, null=True)
    slug = models.CharField(max_length=100)
    total_file_size = models.IntegerField()
    available = models.BooleanField(default=False)
    license = models.ForeignKey('License')
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of', through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship', symmetrical=False, blank=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
    sort_order = models.FloatField(blank=True, null=True)
    license_owner = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Content Metadata'

    class Admin:
        pass

    def __str__(self):
        return self.title

class ContentKind(AbstractContent):
    kind = models.CharField(primary_key=True, max_length=200, choices=kinds.choices)

    def __str__(self):
        return self.kind

class FileFormat(AbstractContent):
    extension = models.CharField(primary_key=True, max_length=40, choices=extensions.choices)

    def __str__(self):
        return self.extension

class FormatPreset(AbstractContent):
    id = models.CharField(primary_key=True, max_length=150, choices=presets.choices)
    readable_name = models.CharField(max_length=400)
    multi_language = models.BooleanField(default=False)
    supplementary = models.BooleanField(default=False)
    order = models.IntegerField()
    kind = models.ForeignKey(ContentKind, related_name='format_presets')
    allowed_formats = models.ManyToManyField(FileFormat, blank=True)

    def __str__(self):
        return self.name

class Language(AbstractContent):
    lang_code = models.CharField(primary_key=True, max_length=400)
    lang_name = models.CharField(max_length=400)

    def __str__(self):
        return self.lang_name

class File(AbstractContent):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    checksum = models.CharField(max_length=400, blank=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)
    contentmetadata = models.ForeignKey(ContentMetadata, related_name='files', blank=True, null=True)
    file_format = models.ForeignKey(FileFormat, related_name='files', blank=True, null=True)
    preset = models.ForeignKey(FormatPreset, related_name='files', blank=True, null=True)
    lang = models.ForeignKey(Language, blank=True, null=True)

    class Admin:
        pass

    def __str__(self):
        return '{checksum}{extension}'.format(checksum=self.checksum, extension='.' + self.file_format.extension)

class License(AbstractContent):
    """
    Normalize the license of ContentMetadata model
    """
    license_name = models.CharField(max_length=50)

    class Admin:
        pass

    def __str__(self):
        return self.license_name

class ContentRelationship(AbstractContent):
    """
    Provide a abstract model for defining any relationships between two ContentMetadata objects.
    """
    contentmetadata_1 = models.ForeignKey(ContentMetadata, related_name='%(app_label)s_%(class)s_1')
    contentmetadata_2 = models.ForeignKey(ContentMetadata, related_name='%(app_label)s_%(class)s_2')

    class Meta:
        abstract = True

    class Admin:
        pass

class PrerequisiteContentRelationship(ContentRelationship):
    """
    Predefine the prerequisite relationship between two ContentMetadata objects.
    """
    class Meta:
        unique_together = ['contentmetadata_1', 'contentmetadata_2']

    class Admin:
        pass

    def clean(self, *args, **kwargs):
        # self reference exception
        if self.contentmetadata_1 == self.contentmetadata_2:
            raise IntegrityError('Cannot self reference as prerequisite.')
        # immediate cyclic exception
        elif PrerequisiteContentRelationship.objects.using(self._state.db)\
                .filter(contentmetadata_1=self.contentmetadata_2, contentmetadata_2=self.contentmetadata_1):
            raise IntegrityError(
                'Note: Prerequisite relationship is directional! %s and %s cannot be prerequisite of each other!'
                % (self.contentmetadata_1, self.contentmetadata_2))
        # distant cyclic exception
        # elif <this is a nice to have exception, may implement in the future when the priority raises.>
        #     raise Exception('Note: Prerequisite relationship is acyclic! %s and %s forms a closed loop!' % (self.contentmetadata_1, self.contentmetadata_2))
        super(PrerequisiteContentRelationship, self).clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super(PrerequisiteContentRelationship, self).save(*args, **kwargs)


class RelatedContentRelationship(ContentRelationship):
    """
    Predefine the related relationship between two ContentMetadata objects.
    """
    class Meta:
        unique_together = ['contentmetadata_1', 'contentmetadata_2']

    class Admin:
        pass

    def save(self, *args, **kwargs):
        # self reference exception
        if self.contentmetadata_1 == self.contentmetadata_2:
            raise IntegrityError('Cannot self reference as related.')
        # handle immediate cyclic
        elif RelatedContentRelationship.objects.using(self._state.db)\
                .filter(contentmetadata_1=self.contentmetadata_2, contentmetadata_2=self.contentmetadata_1):
            return  # silently cancel the save
        super(RelatedContentRelationship, self).save(*args, **kwargs)

class ChannelMetadata(models.Model):
    """
    Provide references to the corresponding contentDB when navigate between channels.
    Every content API method needs a channel_id argument, which is stored in this model.
    """
    channel_id = models.UUIDField(primary_key=False, unique=True, default=uuid4, editable=True)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True)
    author = models.CharField(max_length=400, blank=True)

    class Meta:
        app_label = "content"

    class Admin:
        pass

    def __str__(self):
        return self.name
