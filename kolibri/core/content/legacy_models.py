from django.db import models
from le_utils.constants import file_formats


"""
All models in here must have Meta property abstract = True so that they are available for inspection
but otherwise have no impact on the content app models
"""


class License(models.Model):
    """
    Normalize the license of ContentNode model
    """

    license_name = models.CharField(max_length=50)
    license_description = models.CharField(max_length=400, null=True, blank=True)

    class Meta:
        abstract = True


class File(object):
    """
    A mixin for previously deleted fields of the File Model
    """

    extension = models.CharField(
        max_length=40, choices=file_formats.choices, blank=True
    )
    file_size = models.IntegerField(blank=True, null=True)
    checksum = models.CharField(max_length=400, blank=True)
    available = models.BooleanField(default=False)


class ContentNode(object):
    """
    A mixin for previously deleted field of the File Model
    """

    license = models.ForeignKey("License", null=True, blank=True)
    stemmed_metaphone = models.CharField(
        max_length=1800, blank=True
    )  # for fuzzy search in title and description
