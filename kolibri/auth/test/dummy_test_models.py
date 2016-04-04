"""
The models in this file are defined for purposes of testing
"""

from django.db import models

from ..constants.role_kinds import ADMIN, COACH
from ..models import FacilityUser, Facility, AbstractFacilityDataModel
from ..permissions.base import RoleBasedPermissions
from ..permissions.general import IsOwn, IsFromSameFacility

class DummyUserLogModel(AbstractFacilityDataModel):

    class Meta:
        abstract = True

    # make user log read-writable by admins and user associated with log, and readable by coaches
    permissions = (
        IsOwn() |
        RoleBasedPermissions(
            target_field="user",
            can_be_read_by=[ADMIN, COACH],
            can_be_written_by=[ADMIN],
        )
    )

    user = models.ForeignKey(FacilityUser)

    def infer_dataset(self):
        return self.user.dataset


class DummyFacilitySettingModel(AbstractFacilityDataModel):

    class Meta:
        abstract = True

    # make facility settings readable by anyone from facility, and read-writable by admins
    permissions = (
        IsFromSameFacility(read_only=True) |
        RoleBasedPermissions(
            target_field="facility",
            can_be_read_by=[ADMIN],
            can_be_written_by=[ADMIN],
        )
    )

    facility = models.ForeignKey(Facility)

    def infer_dataset(self):
        return self.facility.dataset
