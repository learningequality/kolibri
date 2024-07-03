import json

from django.db import models
from django.db.utils import IntegrityError
from django.utils import timezone

from .permissions import UserCanReadExamAssignmentData
from .permissions import UserCanReadExamData
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.fields import JSONField
from kolibri.core.notifications.models import LearnerProgressNotification


def exam_assignment_lookup(question_sources):
    """
    Lookup function for the ContentAssignmentManager
    :param question_sources: a list of dicts from an Exam
    :return: a tuple of contentnode_id and metadata
    """
    for question_source in question_sources:
        if "exercise_id" in question_source:
            yield (question_source["exercise_id"], None)
        else:
            questions = question_source.get("questions")
            if questions is not None:
                for question in question_source["questions"]:
                    yield (question["exercise_id"], None)


class AbstractExam(models.Model):
    """
    This class contains shared fields and methods between the DraftExam and Exam models.
    """

    class Meta:
        abstract = True

    title = models.CharField(max_length=200)

    # Total number of questions in the exam. Equal to the length of the question_sources array.
    question_count = models.IntegerField()

    """
    The `question_sources` field contains different values depending on the 'data_model_version' field.

    V3:
        Represents a list of questions of V2 objects each of which are now a "Exam/Quiz Section"
        and extends it with an additional description field. The `learners_see_fixed_order` field
        will now be persisted within each section itself, rather than for the whole quiz.

        # Exam
        [
            # Section 1
            {
                  "section_title": <section title>,
                  "description": <section description>,
                  "question_count": <number of questions in section>,
                  "learners_see_fixed_order": <bool>,
                  "questions": [
                    {
                        "exercise_id": <exercise_pk>,
                        "question_id": <item_id_within_exercise>,
                        "title": <title of question>,
                        "counter_in_exercise": <unique_count_for_question>,
                    },
                  ]
            },

            # Section 2
            {...}
        ]

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
    This field is interpreted differently depending on the 'data_model_version' field.

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

    # Exams are scoped to a particular class (usually) as they are associated with a Coach
    # who creates them in the context of their class, this stores that relationship but does
    # not assign exam itself to the class - for that see the ExamAssignment model.
    collection = models.ForeignKey(
        Collection,
        related_name="%(class)ss",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    creator = models.ForeignKey(
        FacilityUser,
        related_name="%(class)ss",
        blank=False,
        null=True,
        on_delete=models.CASCADE,
    )

    """
    As we evolve this model in ways that migrations can't handle, certain fields may
    become deprecated, and other fields may need to be interpreted differently. This
    may happen when multiple versions of the model need to coexist in the same database.

    The 'data_model_version' field is used to keep track of the version of the model.

    Certain fields that are only relevant for older model versions get prefixed
    with their version numbers.
    """
    data_model_version = models.SmallIntegerField(default=3)

    def __str__(self):
        return self.title

    def get_questions(self):
        """
        Returns a list of all questions from all sections in the exam.
        """
        questions = []
        if self.data_model_version == 3:
            for section in self.question_sources:
                for question in section.get("questions", []):
                    questions.append(question)
        else:
            for question in self.question_sources:
                questions.append(question)
        return questions

    def save(self, *args, **kwargs):
        self.question_count = len(self.get_questions())
        super().save(*args, **kwargs)


class DraftExam(AbstractExam):

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
        is_syncable=False,
    )

    assignments = JSONField(default=list, blank=True)
    learner_ids = JSONField(default=list, blank=True)

    date_created = models.DateTimeField(auto_now_add=True, null=True)

    def to_exam(self):
        """
        Convert this draft exam to an exam object.
        """
        exam = Exam(
            title=self.title,
            question_count=self.question_count,
            question_sources=self.question_sources,
            seed=self.seed,
            learners_see_fixed_order=self.learners_see_fixed_order,
            collection=self.collection,
            creator=self.creator,
            data_model_version=self.data_model_version,
            date_created=self.date_created,
        )
        return exam


class Exam(AbstractExam, AbstractFacilityDataModel):
    """
    This class stores metadata about teacher-created quizzes to test current student knowledge.
    """

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

    morango_model_name = "exam"

    # Is this exam currently active and visible to students to whom it is assigned?
    active = models.BooleanField(default=False)

    date_created = models.DateTimeField(default=timezone.now)

    # To be set True when the quiz is first set to active=True
    date_activated = models.DateTimeField(default=None, null=True, blank=True)

    # archive will be used on the frontend to indicate if a quiz is "closed"
    archive = models.BooleanField(default=False)
    date_archived = models.DateTimeField(default=None, null=True, blank=True)

    content_assignments = ContentAssignmentManager(
        # one exam can contain multiple questions from multiple exercises,
        # hence multiple content nodes
        one_to_many=True,
        filters=dict(active=True),
        lookup_field="question_sources",
        lookup_func=exam_assignment_lookup,
    )

    def delete(self, using=None, keep_parents=False):
        """
        We delete all notifications objects whose quiz is this exam id.
        """
        LearnerProgressNotification.objects.filter(quiz_id=self.id).delete()
        super(Exam, self).delete(using, keep_parents)

    def pre_save(self):
        super(Exam, self).pre_save()

        # maintain stricter enforcement on when creator is allowed to be null
        if self._state.adding and self.creator is None:
            raise IntegrityError("Exam must be saved with an creator")

        # validate that datasets match so this would be syncable
        if self.creator and self.creator.dataset_id != self.dataset_id:
            # the only time creator can be null is if it's a superuser
            # and if we set it to none HERE
            if not self.creator.is_superuser:
                raise IntegrityError("Exam must have creator in the same dataset")
            self.creator = None

    def save(self, *args, **kwargs):
        # If archive is True during the save op, but there is no date_archived then
        # this is the save that is archiving the object and we need to datestamp it
        if getattr(self, "archive", False) is True:
            if getattr(self, "date_archived") is None:
                self.date_archived = timezone.now()
        # If active is True during the save op, but there is no date_activated then
        # this is the save that is archiving the object and we need to datestamp it
        if getattr(self, "active", False) is True:
            if getattr(self, "date_activated") is None:
                self.date_activated = timezone.now()
        # Remove any empty sections from the question sources
        # No need to update the question count here, as sections with no questions
        # will not have been counted in the question count.
        if self.data_model_version == 3:
            self.question_sources = [
                section for section in self.question_sources if section.get("questions")
            ]
        super(Exam, self).save(*args, **kwargs)

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("collection")

    def calculate_partition(self):
        return self.dataset_id


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
    exam = models.ForeignKey(
        Exam,
        related_name="assignments",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    collection = models.ForeignKey(
        Collection,
        related_name="assigned_exams",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    assigned_by = models.ForeignKey(
        FacilityUser,
        related_name="assigned_exams",
        blank=False,
        null=True,
        on_delete=models.CASCADE,
    )

    def pre_save(self):
        super(ExamAssignment, self).pre_save()

        # this shouldn't happen
        if (
            self.exam
            and self.collection
            and self.exam.dataset_id != self.collection.dataset_id
        ):
            raise IntegrityError(
                "Exam assignment foreign models must be in same dataset"
            )

        # maintain stricter enforcement on when assigned_by is allowed to be null
        # assignments aren't usually updated, but ensure only during creation
        if self._state.adding and self.assigned_by is None:
            raise IntegrityError("Exam assignment must be saved with an assigner")

        # validate that datasets match so this would be syncable
        if self.assigned_by and self.assigned_by.dataset_id != self.dataset_id:
            # the only time assigned_by can be null is if it's a superuser
            # and if we set it to none HERE
            if not self.assigned_by.is_superuser:
                # maintain stricter enforcement on when assigned_by is allowed to be null
                raise IntegrityError(
                    "Exam assignment must have assigner in the same dataset"
                )
            self.assigned_by = None

    def infer_dataset(self, *args, **kwargs):
        # infer from exam so assignments align with exams
        return self.cached_related_dataset_lookup("exam")

    def calculate_source_id(self):
        return "{exam_id}:{collection_id}".format(
            exam_id=self.exam_id, collection_id=self.collection_id
        )

    def calculate_partition(self):
        return self.dataset_id


def individual_exam_assignment_lookup(serialized_exam):
    """
    Lookup function for the ContentAssignmentManager
    :param serialized_exam: the exam in form of a dictionary
    :return: a tuple of contentnode_id and metadata
    """
    try:
        question_sources = json.loads(serialized_exam.get("question_sources", "[]"))
        return exam_assignment_lookup(question_sources)
    except json.JSONDecodeError:
        return []


class IndividualSyncableExam(AbstractFacilityDataModel):
    """
    Represents a Exam and its assignment to a particular user
    in such a way that it can be synced to a single-user device.
    Note: This is not the canonical representation of a user's
    relation to an exam (which is captured in an ExamAssignment
    combined with a user's Membership in an associated Collection;
    the purpose of this model is as a derived/denormalized
    representation of a specific user's exam assignments).
    """

    morango_model_name = "individualsyncableexam"

    user = models.ForeignKey(FacilityUser, on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE)
    exam_id = models.UUIDField()

    serialized_exam = JSONField()

    content_assignments = ContentAssignmentManager(
        # one exam can contain multiple questions from multiple exercises,
        # hence multiple content nodes
        one_to_many=True,
        lookup_field="serialized_exam",
        lookup_func=individual_exam_assignment_lookup,
    )

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("user")

    def calculate_source_id(self):
        return self.exam_id

    def calculate_partition(self):
        return "{dataset_id}:user-ro:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.user_id
        )

    @classmethod
    def serialize_exam(cls, exam):
        serialized = exam.serialize()
        for key in [
            "active",
            "creator_id",
            "date_created",
            "date_activated",
            "collection_id",
        ]:
            serialized.pop(key, None)
        return serialized

    @classmethod
    def deserialize_exam(cls, serialized_exam):
        exam = Exam.deserialize(serialized_exam)
        exam.active = True
        return exam
