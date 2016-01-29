"""
This is one of the Kolibri core components, the abstract layer of all contents.
To access it, please use the public APIs in api.py

The ONLY public object is ContentMetadata 
"""
from __future__ import unicode_literals

from django.db import models
from django.core.files.storage import FileSystemStorage
from mptt.models import MPTTModel, TreeForeignKey


def content_copy_name(instance, filename):
    pass

class ChannelMetadata(models.Model):
	pass
	
class ContentCopyStorage(FileSystemStorage):
    pass

class ContentManager(models.Manager):
    pass

class ContentQuerySet(models.QuerySet):
	pass

class AbstractContent(models.Model):
    pass

class ContentMetadata(MPTTModel, AbstractContent):
    pass

class MimeType(AbstractContent):
    pass

class Format(AbstractContent):
    pass

class File(AbstractContent):
    pass

class License(AbstractContent):
    pass

class ContentRelationship(AbstractContent):
    pass

class PrerequisiteContentRelationship(ContentRelationship):
    pass

class RelatedContentRelationship(ContentRelationship):
    pass
