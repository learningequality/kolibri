"""
The models in this file are defined for purposes of testing
"""

from django.db import models

from ..constants import role_kinds
from ..models import FacilityUser, Facility, AbstractFacilityDataModel
from ..permissions import PermitBasedOnRoleForUser, PermitBasedOnRoleForCollection, AssociatedUserCanReadWrite, \
    UsersFromSameFacilityCanRead, apply_permissions

@apply_permissions(  # make user log read-writeable by admins and user associated with log, and readable by coaches
    AssociatedUserCanReadWrite(field="user") |
    PermitBasedOnRoleForUser(
        target_field="user",
        can_read=[role_kinds.ADMIN, role_kinds.COACH],
        can_write=[role_kinds.ADMIN],
    )
)
class DummyUserLogModel(AbstractFacilityDataModel):
    user = models.ForeignKey(FacilityUser)

    def infer_dataset(self):
        return self.user.dataset


@apply_permissions(  # make facility settings readable by anyone from facility, and read-writeable by admins
    UsersFromSameFacilityCanRead() |
    PermitBasedOnRoleForCollection(
        target_field="facility",
        can_read=[role_kinds.ADMIN],
        can_write=[role_kinds.ADMIN],
    )
)
class DummyFacilitySettingModel(AbstractFacilityDataModel):
    facility = models.ForeignKey(Facility)

    def infer_dataset(self):
        return self.facility.dataset
