from django.db import transaction
from django.utils.timezone import now
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import ListField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.serializers import ValidationError

from kolibri.core import error_constants
from kolibri.core.api import HexUUIDField
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.utils.users import create_adhoc_group_for_learners
from kolibri.core.exams.constants import MAX_QUESTIONS_PER_QUIZ_SECTION
from kolibri.core.exams.models import DraftExam
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment


class QuestionSourceSerializer(Serializer):
    exercise_id = HexUUIDField(format="hex")
    question_id = HexUUIDField(format="hex")
    title = CharField(default="", allow_blank=True)
    counter_in_exercise = IntegerField()


class QuizSectionSerializer(Serializer):
    description = CharField(required=False, allow_blank=True)
    section_title = CharField(allow_blank=True, required=False)
    learners_see_fixed_order = BooleanField(default=False)
    questions = ListField(
        child=QuestionSourceSerializer(),
        required=False,
        max_length=MAX_QUESTIONS_PER_QUIZ_SECTION,
    )


class ExamSerializer(ModelSerializer):
    """
    This serializer is used with a ValuesViewset, so is only used to deserialize data
    and do create and update operations. As such, anything that is only required for serializing
    data should be in the ValuesViewset.
    """

    assignments = ListField(
        child=PrimaryKeyRelatedField(read_only=False, queryset=Collection.objects.all())
    )
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=FacilityUser.objects.all()
        ),
        required=False,
    )
    question_sources = ListField(child=QuizSectionSerializer(), required=False)
    draft = BooleanField(default=True, required=False)

    class Meta:
        model = Exam
        fields = (
            "id",
            "title",
            "question_sources",
            "active",
            "collection",
            "archive",
            "assignments",
            "learners_see_fixed_order",
            "learner_ids",
            "draft",
        )

    def _validate_learner_ids(self, collection):
        if "learner_ids" in self.initial_data and self.initial_data["learner_ids"]:
            # First uniqueify the list of learner_ids
            self.initial_data["learner_ids"] = list(
                set(self.initial_data["learner_ids"])
            )
            if (
                len(self.initial_data["learner_ids"])
                != FacilityUser.objects.filter(
                    memberships__collection=collection,
                    id__in=self.initial_data["learner_ids"],
                ).count()
            ):
                raise ValidationError(
                    "Some learner_ids are not members of the collection that this quiz is contained in",
                    code=error_constants.INVALID,
                )

    def _validate_disallowed_draft_fields(self, attrs):
        if (
            self.instance
            and isinstance(self.instance, DraftExam)
            and attrs.get("draft", True)
        ) or (not self.instance and attrs.get("draft", True)):
            # If we are creating or updating a draft we cannot set active or archive
            # raise validation errors if trying to set to true, otherwise pop the field
            # to ignore it.
            if "active" in attrs:
                if attrs["active"]:
                    raise ValidationError(
                        "Cannot update active to true on a DraftExam object",
                        code=error_constants.INVALID,
                    )
                attrs.pop("active")
            if "archive" in attrs:
                if attrs["archive"]:
                    raise ValidationError(
                        "Cannot update archive to true on a DraftExam object",
                        code=error_constants.INVALID,
                    )
                attrs.pop("archive")

    def _validate_title_unique_in_collection(self, title, collection):
        # Check that the title is unique in the collection
        exam_queryset = Exam.objects.filter(title__iexact=title, collection=collection)
        draft_exam_queryset = DraftExam.objects.filter(
            title__iexact=title, collection=collection
        )
        if self.instance:
            # In this case, we are updating an existing model, so we just need to check that the title is unique
            # but exclude the current instance from the check
            if isinstance(self.instance, Exam):
                exam_queryset = exam_queryset.exclude(id=self.instance.id)
            else:
                draft_exam_queryset = draft_exam_queryset.exclude(id=self.instance.id)

        if exam_queryset.exists() or draft_exam_queryset.exists():
            raise ValidationError(
                "The fields title, collection must make a unique set.",
                code=error_constants.UNIQUE,
            )

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")
        self._validate_learner_ids(collection)

        self._validate_disallowed_draft_fields(attrs)

        self._validate_title_unique_in_collection(title, collection)

        if not self.instance and "request" in self.context:
            # If we are creating a new exam, then we need to set the creator to the current user
            attrs["creator"] = self.context["request"].user

        is_non_draft_exam = self.instance and isinstance(self.instance, Exam)

        if "question_sources" in attrs:
            if is_non_draft_exam:
                raise ValidationError(
                    "Cannot update question_sources on an Exam object",
                    code=error_constants.INVALID,
                )
            if not self.instance and not attrs["draft"]:
                if not attrs["question_sources"]:
                    raise ValidationError(
                        "Cannot create an Exam without any question_sources",
                        code=error_constants.INVALID,
                    )
                if all(
                    not section["questions"] for section in attrs["question_sources"]
                ):
                    raise ValidationError(
                        "Cannot create an Exam without any questions",
                        code=error_constants.INVALID,
                    )

        return attrs

    def create(self, validated_data):
        draft = validated_data.pop("draft", True)
        # The kind of object we create depends on whether this is a draft or not, set that here.
        model_class = DraftExam if draft else Exam
        if draft:
            if "assignments" in validated_data:
                validated_data["assignments"] = [
                    collection.id for collection in validated_data["assignments"]
                ]
            if "learner_ids" in validated_data:
                validated_data["learner_ids"] = [
                    learner.id for learner in validated_data["learner_ids"]
                ]
        else:
            collections = validated_data.pop("assignments")
            learners = validated_data.pop("learner_ids", [])
            # Because we need be able to override the Exam date_created with the date_created
            # of the DraftExam, we need to set the date_created here, as we can't use auto_now_add
            validated_data["date_created"] = now()

        # Create the new object
        new_exam = model_class.objects.create(**validated_data)

        if not draft:
            # Create all of the new ExamAssignment objects for the new Exam
            # otherwise, this has already been set in the JSON fields above
            for collection in collections:
                self._create_exam_assignment(exam=new_exam, collection=collection)

            if learners:
                adhoc_group = create_adhoc_group_for_learners(
                    new_exam.collection, learners
                )
                self._create_exam_assignment(exam=new_exam, collection=adhoc_group)

        return new_exam

    def _create_exam_assignment(self, **params):
        return ExamAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )

    def update(self, instance, validated_data):  # noqa
        # Out of an abundance of caution, handle the saving of the new instance and deletion of the old instance
        # in a transaction, so that if an error occurs in either, we don't end up with a mismatched state
        # to make this simpler, we wrap the whole update in a transaction
        with transaction.atomic():
            # Check if the instance we are updating is a draft.
            instance_is_draft = isinstance(instance, DraftExam)
            # Check if the update is updating whether this should be a draft or not
            # default to the current state of the instance
            new_draft_value = validated_data.pop("draft", instance_is_draft)
            if not instance_is_draft and new_draft_value:
                # Don't allow a non draft Exam to be turned into a DraftExam
                raise ValidationError(
                    "Cannot change an Exam to a DraftExam", code=error_constants.INVALID
                )
            elif instance_is_draft and not new_draft_value:
                # If this is a draft, but we are updating it to be an exam, then we need to create the new exam
                # and delete the draft
                if not instance.question_count:
                    raise ValidationError(
                        "Cannot publish a draft exam with no questions",
                        code=error_constants.INVALID,
                    )
                if "assignments" not in validated_data:
                    # First check if the assignments are being updated, if not, then we need to set them
                    # to a queryset of collections - this will silently ignore any assignments for collections
                    # that have been deleted since this draft was created
                    validated_data["assignments"] = Collection.objects.filter(
                        id__in=instance.assignments
                    )
                if "learner_ids" not in validated_data:
                    # Now check if the learner_ids are being updated, if not, then we need to set them
                    # to a queryset of learners - this will silently ignore any learners that have been deleted
                    # since this draft was created
                    validated_data["learner_ids"] = FacilityUser.objects.filter(
                        id__in=instance.learner_ids
                    )
                # Create the new Exam object
                new_instance = instance.to_exam()
                # Save the new instance
                new_instance.save()
                # Delete the old instance
                instance.delete()
                # Set the instance to the new instance
                instance = new_instance
                # Set the instance_is_draft to False
                # so that the rest of the update logic is run
                # as if this was an Exam object (which it now is)
                instance_is_draft = False
            # Update the scalar fields
            instance.title = validated_data.pop("title", instance.title)
            instance.learners_see_fixed_order = validated_data.pop(
                "learners_see_fixed_order", instance.learners_see_fixed_order
            )
            if not instance_is_draft:
                # Update the non-draft specific fields
                instance.active = validated_data.pop("active", instance.active)
                instance.archive = validated_data.pop("archive", instance.archive)

            else:
                # Update the draft specific fields
                # note that this means that you cannot update the question sources
                # in the same API request as you publish a draft exam to be an exam
                # as by this point instance_is_draft is False if we are publishing a draft
                instance.question_sources = validated_data.pop(
                    "question_sources", instance.question_sources
                )

            # Add/delete any new/removed Assignments
            if "assignments" in validated_data:
                collections = validated_data.pop("assignments")

                collections = [
                    collection
                    for collection in collections
                    if collection.kind != ADHOCLEARNERSGROUP
                ]

                if instance_is_draft:
                    # If this is a draft exam, then we need to update the assignments
                    # directly on the instance
                    instance.assignments = [collection.id for collection in collections]
                else:
                    # If this is an exam, then we need to update the ExamAssignment objects
                    current_group_ids = set(
                        instance.assignments.exclude(
                            collection__kind=ADHOCLEARNERSGROUP
                        ).values_list("collection__id", flat=True)
                    )

                    for collection in collections:
                        if collection.id not in current_group_ids:
                            self._create_exam_assignment(
                                exam=instance, collection=collection
                            )

                    # Clean up any exam assignments that were previously made but are no longer needed
                    # based on the new list of collections
                    ExamAssignment.objects.filter(
                        exam_id=instance.id,
                        collection_id__in=(
                            current_group_ids - set(c.id for c in collections)
                        ),
                    ).exclude(collection__kind=ADHOCLEARNERSGROUP).delete()

            # Update adhoc assignment
            if "learner_ids" in validated_data:
                learner_ids = validated_data.pop("learner_ids")
                self._update_learner_ids(instance, learner_ids)

            instance.save()

        return instance

    def _update_learner_ids(self, instance, learners):
        if isinstance(instance, DraftExam):
            instance.learner_ids = [learner.id for learner in learners]
            return
        try:
            adhoc_group_assignment = ExamAssignment.objects.select_related(
                "collection"
            ).get(exam=instance, collection__kind=ADHOCLEARNERSGROUP)
        except ExamAssignment.DoesNotExist:
            adhoc_group_assignment = None
        if not learners:
            # Setting learner_ids to empty, so only need to do something
            # if there is already an adhoc_group_assignment defined
            if adhoc_group_assignment is not None:
                # Adhoc group already exists delete it and the assignment
                # cascade deletion should also delete the adhoc_group_assignment
                adhoc_group_assignment.collection.delete()
        else:
            if adhoc_group_assignment is None:
                # There is no adhoc group right now, so just make a new one
                adhoc_group = create_adhoc_group_for_learners(
                    instance.collection, learners
                )
                self._create_exam_assignment(exam=instance, collection=adhoc_group)
            else:
                # There is an adhoc group, so we need to potentially update its membership
                original_learner_ids = Membership.objects.filter(
                    collection=adhoc_group_assignment.collection
                ).values_list("user_id", flat=True)
                original_learner_ids_set = set(original_learner_ids)
                learner_ids_set = {learner.id for learner in learners}
                if original_learner_ids_set != learner_ids_set:
                    # Only bother to do anything if these are different
                    new_learner_ids = learner_ids_set - original_learner_ids_set
                    deleted_learner_ids = original_learner_ids_set - learner_ids_set

                    if deleted_learner_ids:
                        Membership.objects.filter(
                            collection=adhoc_group_assignment.collection,
                            user_id__in=deleted_learner_ids,
                        ).delete()

                    for new_learner_id in new_learner_ids:
                        Membership.objects.create(
                            user_id=new_learner_id,
                            collection=adhoc_group_assignment.collection,
                        )
