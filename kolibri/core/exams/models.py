from django.db import models
from jsonfield import JSONField

from django.utils import timezone
from .permissions import UserCanReadExamAssignmentData
from .permissions import UserCanReadExamData
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.notifications.models import LearnerProgressNotification


class Exam(AbstractFacilityDataModel):
    """
    This class stores metadata about teacher-created quizzes to test current student knowledge.
    """

    morango_model_name = "exam"

    permissions = (
        RoleBasedPermissions(
            target_field="collection",
            can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
        )
        | UserCanReadExamData()
    )

    title = models.CharField(max_length=200)

    # Total number of questions in the exam. Equal to the length of the question_sources array.
    question_count = models.IntegerField()

    """
    The `question_sources` field contains different values depending on the 'data_model_version' field.

    V2:
        Similar to V1, but with a `counter_in_exercise` field
        [
            {
                "exercise_id": <exercise_pk>,
                "question_id": <item_id_within_exercise>,
                "title": <exercise_title>,
                "counter_in_exercise": <unique_count_for_question>
            },
            ...
        ]

    V1:
        JSON array describing the questions in this exam and the exercises they come from:
        [
            {
                "exercise_id": <exercise_pk>,
                "question_id": <item_id_within_exercise>,
                "title": <exercise_title>,
            },
            ...
        ]
    V0:
        JSON array describing exercise nodes this exam draws questions from,
        how many from each, and the node titles at the time of exam creation:
        [
            {
                "exercise_id": <exercise_pk>,
                "number_of_questions": 6,
                "title": <exercise_title>
            },
            ...
        ]
    """
    question_sources = JSONField(default=[], blank=True)

    """
    This field is interpretted differently depending on the 'data_model_version' field.

    V1:
        Used to help select new questions from exercises at quiz creation time

    V0:
        Used to decide which questions are in an exam at runtime.
        See convertExamQuestionSourcesV0V2 in exams/utils.js for details.
    """
    seed = models.IntegerField(default=1)

    # When True, learners see questions in the order they appear in 'question_sources'.
    # When False, each learner sees questions in a random (but consistent) order seeded
    #   by their user's UUID.
    learners_see_fixed_order = models.BooleanField(default=False)

    # Is this exam currently active and visible to students to whom it is assigned?
    active = models.BooleanField(default=False)

    # Exams are scoped to a particular class (usually) as they are associated with a Coach
    # who creates them in the context of their class, this stores that relationship but does
    # not assign exam itself to the class - for that see the ExamAssignment model.
    collection = models.ForeignKey(
        Collection, related_name="exams", blank=False, null=False
    )
    creator = models.ForeignKey(
        FacilityUser, related_name="exams", blank=False, null=False
    )

    # To be set True when the quiz is first set to active=True
    date_activated = models.DateTimeField(default=None, null=True, blank=True)

    date_created = models.DateTimeField(auto_now_add=True, null=True)

    # archive will be used on the frontend to indicate if a quiz is "closed"
    archive = models.BooleanField(default=False)
    date_archived = models.DateTimeField(default=None, null=True, blank=True)

    def delete(self, using=None, keep_parents=False):
        """
        We delete all notifications objects whose quiz is this exam id.
        """
        LearnerProgressNotification.objects.filter(quiz_id=self.id).delete()
        super(Exam, self).delete(using, keep_parents)

    def save(self, *args, **kwargs):
        # If archive is True during the save op, but there is no date_archived then
        # this is the save that is archiving the object and we need to datestamp it
        if getattr(self, "archive", False) is True:
            if getattr(self, "date_archived") is None:
                self.date_archived = timezone.now()
        super(Exam, self).save(*args, **kwargs)

    """
    As we evolve this model in ways that migrations can't handle, certain fields may
    become deprecated, and other fields may need to be interpretted differently. This
    may happen when multiple versions of the model need to coexist in the same database.

    The 'data_model_version' field is used to keep track of the version of the model.

    Certain fields that are only relevant for older model versions get prefixed
    with their version numbers.
    """
    data_model_version = models.SmallIntegerField(default=2)

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("creator")

    def calculate_partition(self):
        return self.dataset_id

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
            can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(),
            can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
        )
        | UserCanReadExamAssignmentData()
    )
    exam = models.ForeignKey(Exam, related_name="assignments", blank=False, null=False)
    collection = models.ForeignKey(
        Collection, related_name="assigned_exams", blank=False, null=False
    )
    assigned_by = models.ForeignKey(
        FacilityUser, related_name="assigned_exams", blank=False, null=False
    )

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("assigned_by")

    def calculate_source_id(self):
        return "{exam_id}:{collection_id}".format(
            exam_id=self.exam_id, collection_id=self.collection_id
        )

    def calculate_partition(self):
        return self.dataset_id
