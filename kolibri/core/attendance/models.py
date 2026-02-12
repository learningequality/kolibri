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
    Represents a single attendance-taking session for a classroom on a given date.
    Multiple sessions can exist for the same classroom on the same date
    (e.g., morning and afternoon sessions).
    """

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
    )

    collection = models.ForeignKey(
        Collection,
        related_name="attendance_sessions",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    date = models.DateField()
    session_number = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        FacilityUser,
        related_name="attendance_sessions_created",
        blank=False,
        null=True,
        on_delete=models.CASCADE,
    )
    date_created = DateTimeTzField(default=local_now, editable=False)

    morango_model_name = "attendancesession"

    class Meta:
        ordering = ["-date", "-session_number"]

    def save(self, *args, **kwargs):
        if self._state.adding:
            last = (
                AttendanceSession.objects.filter(
                    collection=self.collection,
                    date=self.date,
                )
                .order_by("-session_number")
                .values_list("session_number", flat=True)
                .first()
            )
            self.session_number = (last or 0) + 1
        super().save(*args, **kwargs)

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("collection")

    def calculate_partition(self):
        return self.dataset_id

    def __str__(self):
        return f"Attendance Session {self.session_number} on {self.date} for {self.collection.name}"


class AttendanceRecord(AbstractFacilityDataModel):
    """
    Records a single learner's attendance status within an AttendanceSession.
    """

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
        collection_field="session__collection",
    )

    session = models.ForeignKey(
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

    morango_model_name = "attendancerecord"

    class Meta:
        unique_together = (("session", "user"),)

    @property
    def collection(self):
        return self.session.collection

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("session")

    def calculate_source_id(self):
        return f"{self.session_id}:{self.user_id}"

    def calculate_partition(self):
        return self.dataset_id

    def __str__(self):
        status = "Present" if self.present else "Absent"
        return f"{self.user.full_name}: {status} for session {self.session_id}"
