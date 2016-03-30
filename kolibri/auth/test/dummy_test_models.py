"""
The models in this file are defined for purposes of testing
"""

from django.db import models

from ..constants.role_kinds import ADMIN, COACH
from ..models import FacilityUser, Facility, AbstractFacilityDataModel
from ..base_permissions import RoleBasedPermissions, IsOwn, IsFromSameFacility, apply_permissions

@apply_permissions(  # make user log read-writeable by admins and user associated with log, and readable by coaches
    IsOwn() |
    RoleBasedPermissions(
        target_field="user",
        can_be_read_by=[ADMIN, COACH],
        can_be_written_by=[ADMIN],
    )
)
class DummyUserLogModel(AbstractFacilityDataModel):
    user = models.ForeignKey(FacilityUser)

    def infer_dataset(self):
        return self.user.dataset


@apply_permissions(  # make facility settings readable by anyone from facility, and read-writeable by admins
    IsFromSameFacility(read_only=True) |
    RoleBasedPermissions(
        target_field="facility",
        can_be_read_by=[ADMIN],
        can_be_written_by=[ADMIN],
    )
)
class DummyFacilitySettingModel(AbstractFacilityDataModel):
    facility = models.ForeignKey(Facility)

    def infer_dataset(self):
        return self.facility.dataset
