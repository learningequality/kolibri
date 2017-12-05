from django.conf import settings
from django.db import models
from kolibri.auth.models import Facility, FacilityUser

from .permissions import UserCanManageDevicePermissions

device_permissions_fields = [
    'is_superuser',
    'can_manage_content',
]


class DevicePermissions(models.Model):
    """
    This class stores metadata about device permissions for FacilityUsers.
    """

    permissions = UserCanManageDevicePermissions()

    user = models.OneToOneField(FacilityUser, on_delete=models.CASCADE, related_name='devicepermissions', blank=False, null=False, primary_key=True)
    is_superuser = models.BooleanField(default=False)
    can_manage_content = models.BooleanField(default=False)


class DeviceSettings(models.Model):
    """
    This class stores data about settings particular to this device
    """

    is_provisioned = models.BooleanField(default=False)
    language_id = models.CharField(max_length=15, default=settings.LANGUAGE_CODE)
    default_facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, blank=True, null=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(DeviceSettings, self).save(*args, **kwargs)
