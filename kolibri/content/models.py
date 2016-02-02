"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentMetadata 
"""
import os
import hashlib
from django.contrib import admin
from django.db import models, connections
from uuid import uuid4
from mptt.models import MPTTModel, TreeForeignKey
from django.db.utils import ConnectionDoesNotExist
from django.conf import settings
from django.core.files.storage import FileSystemStorage

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
            print 'find duplicated file: ', name
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
            init_connection = connections[alias]
        except ConnectionDoesNotExist:
            connections.databases[alias] = {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(settings.CONTENT_DB_DIR, alias+'.sqlite3'),
            }

        return super(ContentQuerySet, self).using(alias)

class AbstractContent(models.Model):
    objects = ContentManager.from_queryset(ContentQuerySet)()

    class Meta:
        abstract = True

class ContentMetadata(MPTTModel, AbstractContent):
    """
    The top layer of the contentDB schema, defines the most common properties that are shared across all different contents.
    Things it can represent are, for example, video, exercise, audio or document...
    """
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
    checksum = models.CharField(max_length=400, blank=True, null=True)
    extension = models.CharField(max_length=100, blank=True, null=True)
    available = models.BooleanField(default=False)
    file_size = models.IntegerField(blank=True, null=True)
    content_copy = models.FileField(upload_to=content_copy_name, storage=ContentCopyStorage(), blank=True)
    format = models.ForeignKey(Format, related_name='files', blank=True, null=True)

    class Admin:
        pass

    def __str__(self):
        return '{checksum}.{extension}'.format(checksum=self.checksum, extension=self.extension)

    def save(self, *args, **kwargs):
        """
        Overrider the default save method.
        If the content_copy FileField gets passed a content copy:
            1. generate the MD5 from the content copy
            2. fill the other fields accordingly
        If None is passed to the content_copy FileField:
            1. delete the content copy.
        """
        if self.content_copy: # if content_copy is supplied, hash out the file
            md5 = hashlib.md5()
            for chunk in self.content_copy.chunks():
                md5.update(chunk)

            self.checksum = md5.hexdigest()
            self.available = True
            self.file_size = self.content_copy.size
            self.extension = os.path.splitext(self.content_copy.name)[1]
        else:
            self.checksum = None
            self.available = False
            self.file_size = None
            self.extension = None
        super(File, self).save(*args, **kwargs)

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
    relationship_type = models.CharField(max_length=50)

    class Meta:
        unique_together = ['contentmetadata_1', 'contentmetadata_2', 'relationship_type']
    class Admin:
        pass

class RelatedContentRelationship(ContentRelationship):
    """
    Predefine the related relationship between two ContentMetadata objects.
    """
    relationship_type = models.CharField(max_length=50)

    class Meta:
        unique_together = ['contentmetadata_1', 'contentmetadata_2', 'relationship_type']
    class Admin:
        pass

class PrerequisiteRelationshipInline1(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'contentmetadata_1'
    max = 20
    extra = 0

class PrerequisiteRelationshipInline2(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'contentmetadata_2'
    max = 20
    extra = 0

class RelatedRelationshipInline1(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentmetadata_1'
    max = 20
    extra = 0

class RelatedRelationshipInline2(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentmetadata_2'
    max = 20
    extra = 0

class ContentMetadataAdmin(admin.ModelAdmin):
    inlines = (PrerequisiteRelationshipInline1, PrerequisiteRelationshipInline2, RelatedRelationshipInline1, RelatedRelationshipInline2)


class ChannelMetadata(models.Model):
    """
    Provide references to the corresponding contentDB when navigate between channels. 
    Every content API method needs a channel_id argument, which is stored in this model. 
    """
    channel_id = models.UUIDField(primary_key=False, default=uuid4, editable=True)
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