from collections import OrderedDict

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
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.serializers import DateTimeTzField


class NestedCollectionSerializer(ModelSerializer):
    class Meta:
        model = Collection
        fields = ("id", "name", "kind")


class QuestionSourceSerializer(Serializer):
    exercise_id = HexUUIDField(format="hex")
    # V0 need not have question_id that is why required=False
    question_id = HexUUIDField(format="hex", required=False)
    title = CharField()
    counter_in_exercise = IntegerField()


class ExamSerializer(ModelSerializer):

    assignments = ListField(
        child=PrimaryKeyRelatedField(read_only=False, queryset=Collection.objects.all())
    )
    learner_ids = ListField(
        child=PrimaryKeyRelatedField(
            read_only=False, queryset=FacilityUser.objects.all()
        ),
        required=False,
    )
    question_sources = ListField(child=QuestionSourceSerializer(), required=False)
    creator = PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    date_archived = DateTimeTzField(allow_null=True)
    date_activated = DateTimeTzField(allow_null=True)

    class Meta:
        model = Exam
        fields = (
            "id",
            "title",
            "question_count",
            "question_sources",
            "seed",
            "active",
            "collection",
            "archive",
            "date_archived",
            "date_activated",
            "assignments",
            "creator",
            "data_model_version",
            "learners_see_fixed_order",
            "learner_ids",
        )
        read_only_fields = ("data_model_version",)

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")
        if "learner_ids" in self.initial_data and self.initial_data["learner_ids"]:
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
        # if obj doesn't exist, return data
        try:
            obj = Exam.objects.get(title__iexact=title, collection=collection)
        except Exam.DoesNotExist:
            return attrs
        # if we are updating object, and this `instance` is the same object, return data
        if self.instance and obj.id == self.instance.id:
            return attrs
        else:
            raise ValidationError(
                "The fields title, collection must make a unique set.",
                code=error_constants.UNIQUE,
            )

    def to_internal_value(self, data):
        # Make a new OrderedDict from the input, which could be an immutable QueryDict
        data = OrderedDict(data)
        if "creator" not in data:
            if self.context["view"].action == "create":
                data["creator"] = self.context["request"].user.id
            else:
                # Otherwise we are just updating the exam, so allow a partial update
                self.partial = True
        return super(ExamSerializer, self).to_internal_value(data)

    def create(self, validated_data):
        collections = validated_data.pop("assignments")
        learners = validated_data.pop("learner_ids", [])
        new_exam = Exam.objects.create(**validated_data)
        # Create all of the new ExamAssignment
        for collection in collections:
            self._create_exam_assignment(exam=new_exam, collection=collection)

        if learners:
            adhoc_group = create_adhoc_group_for_learners(new_exam.collection, learners)
            self._create_exam_assignment(exam=new_exam, collection=adhoc_group)

        return new_exam

    def _create_exam_assignment(self, **params):
        return ExamAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )

    def update(self, instance, validated_data):  # noqa
        # Update the scalar fields
        instance.title = validated_data.get("title", instance.title)
        instance.active = validated_data.get("active", instance.active)
        instance.archive = validated_data.get("archive", instance.archive)
        instance.date_activated = validated_data.get(
            "date_activated", instance.date_activated
        )
        instance.date_archived = validated_data.get(
            "date_archived", instance.date_archived
        )

        # Add/delete any new/removed Assignments
        if "assignments" in validated_data:
            collections = validated_data.pop("assignments")
            current_group_ids = set(
                instance.assignments.exclude(
                    collection__kind=ADHOCLEARNERSGROUP
                ).values_list("collection__id", flat=True)
            )
            new_group_ids = {x.id for x in collections}

            for cid in new_group_ids - current_group_ids:
                collection = Collection.objects.get(id=cid)
                if collection.kind != ADHOCLEARNERSGROUP:
                    self._create_exam_assignment(exam=instance, collection=collection)

            ExamAssignment.objects.filter(
                exam_id=instance.id,
                collection_id__in=(current_group_ids - new_group_ids),
            ).exclude(collection__kind=ADHOCLEARNERSGROUP).delete()

        # Update adhoc assignment
        if "learner_ids" in validated_data:
            self._update_learner_ids(instance, validated_data["learner_ids"])

        instance.save()
        return instance

    def _update_learner_ids(self, instance, learners):
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
