from django.db import models


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
