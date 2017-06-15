from django.db import models
from jsonfield import JSONField

from kolibri.auth.constants import role_kinds
from kolibri.auth.models import AbstractFacilityDataModel, Collection, FacilityUser
from kolibri.auth.permissions.base import RoleBasedPermissions

from .permissions import UserCanReadExamAssignmentData

class Exam(AbstractFacilityDataModel):
    """
    This class stores metadata about teacher created exams to test current student knowledge.
    """

    morango_model_name = "exam"

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(),
    )

    title = models.CharField(max_length=200)
    # The channel this Exam is associated with.
    channel_id = models.CharField(max_length=32)
    # Number of total questions this exam has
    question_count = models.IntegerField()
    """
    JSON blob describing content ids for the assessments this exam draws from, and how many
    questions each assessment contributes to the exam. e.g.:

    [
        {"exercise_id": <content_id1>, "number_of_questions": 6},
        {"exercise_id": <content_id2>, "number_of_questions": 5}
    ]
    """
    question_sources = JSONField(default=[], blank=True)
    # The random seed we use to decide which questions are in the exam
    seed = models.IntegerField(default=1)
    # Is this exam currently active and visible to students to whom it is assigned?
    active = models.BooleanField(default=False)
    # Exams are scoped to a particular class (usually) as they are associated with a Coach
    # who creates them in the context of their class, this stores that relationship but does
    # not assign exam itself to the class - for that see the ExamAssignment model.
    collection = models.ForeignKey(Collection, related_name='exams', blank=False, null=False)
    creator = models.ForeignKey(FacilityUser, related_name='exams', blank=False, null=False)
    archive = models.BooleanField(default=False)

    def infer_dataset(self, *args, **kwargs):
        return self.creator.dataset

    def calculate_partition(self):
        return "{dataset_id}:crossuser".format(dataset_id=self.dataset_id)

    def __str__(self):
        return self.title


class ExamAssignment(AbstractFacilityDataModel):
    """
    This class acts as an intermediary to handle assignment of an exam to particular collections
    classes, groups, etc.
    """

    morango_model_name = "examassignment"

    permissions = (
        RoleBasedPermissions(
            target_field="collection",
            can_be_created_by=(),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_deleted_by=(),
        ) | UserCanReadExamAssignmentData()
    )
    exam = models.ForeignKey(Exam, related_name='assignments', blank=False, null=False)
    collection = models.ForeignKey(Collection, related_name='assigned_exams', blank=False, null=False)
    assigned_by = models.ForeignKey(FacilityUser, related_name='assigned_exams', blank=False, null=False)

    def infer_dataset(self, *args, **kwargs):
        return self.assigned_by.dataset

    def calculate_partition(self):
        return "{dataset_id}:crossuser".format(dataset_id=self.dataset_id)
