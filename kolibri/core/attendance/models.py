from django.db import models

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time_utils import local_now


class AttendanceSession(AbstractFacilityDataModel):
    """
    Represents a single attendance-taking event for a classroom.
    """

    morango_model_name = "attendancesession"

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN,),
    )

    collection = models.ForeignKey(
        Collection,
        related_name="attendance_sessions",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    created_by = models.ForeignKey(
        FacilityUser,
        related_name="attendance_sessions_created",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
    )

    session_start_datetime = DateTimeTzField(default=local_now)
    date_created = DateTimeTzField(default=local_now, editable=False)
    date_modified = DateTimeTzField(default=local_now)

    def __str__(self):
        return "AttendanceSession for {}".format(self.collection)

    def pre_save(self, **kwargs):
        super().pre_save(**kwargs)
        self.enforce_authoring_user_field("created_by", **kwargs)

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("collection")

    def calculate_partition(self):
        return self.dataset_id


class AttendanceRecord(AbstractFacilityDataModel):
    """
    One record per learner per attendance session.
    """

    morango_model_name = "attendancerecord"

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN,),
        collection_field="attendance_session__collection",
    )

    attendance_session = models.ForeignKey(
        AttendanceSession,
        related_name="attendance_records",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    user = models.ForeignKey(
        FacilityUser,
        related_name="attendance_records",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    present = models.BooleanField(default=False)

    class Meta:
        unique_together = (("attendance_session", "user"),)

    @property
    def collection(self):
        return self.attendance_session.collection

    def __str__(self):
        return "AttendanceRecord for {} in {}".format(
            self.user, self.attendance_session
        )

    def calculate_source_id(self):
        return "{attendance_session_id}:{user_id}".format(
            attendance_session_id=self.attendance_session_id,
            user_id=self.user_id,
        )

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("attendance_session")

    def calculate_partition(self):
        return self.dataset_id
