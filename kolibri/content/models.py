"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentMetadata
"""
from __future__ import print_function

import hashlib
import logging
import os
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, OperationalError, connections, models
from django.db.utils import ConnectionDoesNotExist
from mptt.models import MPTTModel, TreeForeignKey


def content_copy_name(instance, filename):
    """
    Create a name spaced file path from the File obejct's checksum property.
    This path will be used to store the content copy

    :param instance: File (content File model)
    :param filename: str
    :return: str
    """
    h = instance.checksum
    basename, ext = os.path.splitext(filename)
    return os.path.join(settings.CONTENT_COPY_DIR, h[0:1], h[1:2], h + ext.lower())

class ContentCopyStorage(FileSystemStorage):
    """
    Overrider FileSystemStorage's default save method to ignore duplicated file.
    """
    def get_available_name(self, name):
        return name

    def _save(self, name, content):
        if self.exists(name):
            # if the file exists, do not call the superclasses _save method
            logging.warn('Content copy "%s" already exists!' % name)
            return name
        return super(ContentCopyStorage, self)._save(name, content)

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

    class Meta:
        abstract = True

class ContentTag(AbstractContent):
    objects = ContentManager.from_queryset(ContentQuerySet)()

    tag_name = models.CharField(max_length=30, null=True, blank=True)
    tag_type = models.CharField(max_length=30, null=True, blank=True)

    def __str__(self):
        return self.tag_name

class ContentMetadata(MPTTModel, AbstractContent):
    """
    The top layer of the contentDB schema, defines the most common properties that are shared across all different contents.
    Things it can represent are, for example, video, exercise, audio or document...
    """
    objects = ContentManager.from_queryset(ContentQuerySet)()

    content_id = models.UUIDField(primary_key=False, default=uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=400, blank=True, null=True)
    kind = models.CharField(max_length=50)
    slug = models.CharField(max_length=100)
    total_file_size = models.IntegerField()
    available = models.BooleanField(default=False)
    license = models.ForeignKey('License')
    prerequisite = models.ManyToManyField('self', related_name='is_prerequisite_of', through='PrerequisiteContentRelationship', symmetrical=False, blank=True)
    is_related = models.ManyToManyField('self', related_name='relate_to', through='RelatedContentRelationship', symmetrical=False, blank=True)
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    tags = models.ManyToManyField(ContentTag, symmetrical=False, related_name='tagged_content', blank=True)
    sort_order = models.FloatField(blank=True, null=True)
    license_owner = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        verbose_name = 'Content Metadata'

    class Admin:
        pass

    def __str__(self):
        return self.title

class MimeType(AbstractContent):
    """
    Normalize the "kind"(mimetype) of Format model
    """
    objects = ContentManager.from_queryset(ContentQuerySet)()

    readable_name = models.CharField(max_length=50)
    machine_name = models.CharField(max_length=100)

    class Admin:
        pass

    def __str__(self):
        return self.readable_name

class Format(AbstractContent):
    """
    The intermediate layer of the contentDB schema, defines a complete set of resources that is ready to be rendered on the front-end,
    including the quality of the content.
    Things it can represent are, for example, high_resolution_video, low_resolution_video, vectorized_video, khan_excercise...
    """
    objects = ContentManager.from_queryset(ContentQuerySet)()

    available = models.BooleanField(default=False)
    format_size = models.IntegerField(blank=True, null=True)
    quality = models.CharField(max_length=50, blank=True, null=True)
    contentmetadata = models.ForeignKey(ContentMetadata, related_name='formats', blank=True, null=True)
    mimetype = models.ForeignKey(MimeType, blank=True, null=True)

    class Admin:
        pass

class File(AbstractContent):
    """
    The bottom layer of the contentDB schema, defines the basic building brick for content.
    Things it can represent are, for example, mp4, avi, mov, html, css, jpeg, pdf, mp3...
    """
    objects = ContentManager.from_queryset(ContentQuerySet)()

    checksum = models.CharField(max_length=400, blank=True, null=True)
    extension = models.CharField(max_length=100, blank=True, null=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)
    content_copy = models.FileField(upload_to=content_copy_name, storage=ContentCopyStorage(), max_length=200, blank=True)
    format = models.ForeignKey(Format, related_name='files', blank=True, null=True)

    class Admin:
        pass

    def __str__(self):
        return '{checksum}{extension}'.format(checksum=self.checksum, extension=self.extension)

    def save(self, *args, **kwargs):
        """
        Overrider the default save method.
        If the content_copy FileField gets passed a content copy:
            1. generate the MD5 from the content copy
            2. fill the other fields accordingly
            3. update tracking for this content copy
        If None is passed to the content_copy FileField:
            1. delete the content copy.
            2. update tracking for this content copy
        """
        if self.content_copy:  # if content_copy is supplied, hash out the file
            md5 = hashlib.md5()
            for chunk in self.content_copy.chunks():
                md5.update(chunk)

            self.checksum = md5.hexdigest()
            self.available = True
            self.file_size = self.content_copy.size
            self.extension = os.path.splitext(self.content_copy.name)[1]
            # update ContentCopyTracking
            try:
                content_copy_track = ContentCopyTracking.objects.get(content_copy_id=self.checksum)
                content_copy_track.referenced_count += 1
                content_copy_track.save()
            except ContentCopyTracking.DoesNotExist:
                ContentCopyTracking.objects.create(referenced_count=1, content_copy_id=self.checksum)
        else:
            # update ContentCopyTracking, if referenced_count reach 0, delete the content copy on disk
            try:
                content_copy_track = ContentCopyTracking.objects.get(content_copy_id=self.checksum)
                content_copy_track.referenced_count -= 1
                content_copy_track.save()
                if content_copy_track.referenced_count == 0:
                    content_copy_path = os.path.join(settings.CONTENT_COPY_DIR, self.checksum[0:1], self.checksum[1:2], self.checksum + self.extension)
                    if os.path.isfile(content_copy_path):
                        os.remove(content_copy_path)
            except ContentCopyTracking.DoesNotExist:
                pass
            self.checksum = None
            self.available = False
            self.file_size = None
            self.extension = None
        super(File, self).save(*args, **kwargs)

class License(AbstractContent):
    """
    Normalize the license of ContentMetadata model
    """
    objects = ContentManager.from_queryset(ContentQuerySet)()

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
    description = models.CharField(max_length=400, blank=True, null=True)
    author = models.CharField(max_length=400, blank=True, null=True)
    theme = models.CharField(max_length=400, blank=True, null=True)
    subscribed = models.BooleanField(default=False)

    class Meta:
        app_label = "content"

    class Admin:
        pass

    def __str__(self):
        return self.name

class ContentCopyTracking(models.Model):
    """
    Record how many times a content copy are referenced by File objects.
    If it reaches 0, it's supposed to be deleted.
    """
    referenced_count = models.IntegerField(blank=True, null=True)
    content_copy_id = models.CharField(max_length=400, unique=True)

    class Admin:
        pass
