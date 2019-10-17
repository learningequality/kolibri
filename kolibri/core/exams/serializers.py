from collections import OrderedDict

from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField

from kolibri.core import error_constants
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.serializers import DateTimeTzField


class NestedCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ("id", "name", "kind")


class NestedExamAssignmentSerializer(serializers.ModelSerializer):

    collection = NestedCollectionSerializer(read_only=True)

    class Meta:
        model = ExamAssignment
        fields = ("id", "exam", "collection")


class ExamAssignmentCreationSerializer(serializers.ModelSerializer):
    assigned_by = serializers.PrimaryKeyRelatedField(
        read_only=False, queryset=FacilityUser.objects.all()
    )
    collection = serializers.PrimaryKeyRelatedField(
        read_only=False, queryset=Collection.objects.all()
    )

    class Meta:
        model = ExamAssignment
        fields = ("id", "exam", "collection", "assigned_by")
        read_only_fields = ("assigned_by",)

    def to_internal_value(self, data):
        # Make a new OrderedDict from the input, which could be an immutable QueryDict
        data = OrderedDict(data)
        data["assigned_by"] = self.context["request"].user.id
        return super(ExamAssignmentCreationSerializer, self).to_internal_value(data)


class ExamAssignmentRetrieveSerializer(serializers.ModelSerializer):

    assigned_by = serializers.PrimaryKeyRelatedField(read_only=True)
    collection = NestedCollectionSerializer(read_only=True)
    collection_kind = SerializerMethodField()

    def get_collection_kind(self, instance):
        return instance.collection.kind

    class Meta:
        model = ExamAssignment
        fields = ("id", "exam", "collection", "assigned_by", "collection_kind")
        read_only_fields = ("assigned_by", "collection", "collection_kind")


class ExamAssignmentNestedSerializer(ExamAssignmentRetrieveSerializer):

    collection = serializers.PrimaryKeyRelatedField(
        read_only=False, queryset=Collection.objects.all()
    )

    class Meta(ExamAssignmentRetrieveSerializer.Meta):
        read_only_fields = ("assigned_by", "collection_kind", "exam")


class ExamSerializer(serializers.ModelSerializer):

    assignments = ExamAssignmentNestedSerializer(many=True)
    question_sources = serializers.JSONField(default="[]")
    creator = serializers.PrimaryKeyRelatedField(
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
        )
        read_only_fields = ("data_model_version",)

    def validate(self, attrs):
        title = attrs.get("title")
        # first condition is for creating object, second is for updating
        collection = attrs.get("collection") or getattr(self.instance, "collection")
        # if obj doesn't exist, return data
        try:
            obj = Exam.objects.get(title__iexact=title, collection=collection)
        except Exam.DoesNotExist:
            return attrs
        # if we are updating object, and this `instance` is the same object, return data
        if self.instance and obj.id == self.instance.id:
            return attrs
        else:
            raise serializers.ValidationError(
                "The fields title, collection must make a unique set.",
                code=error_constants.UNIQUE,
            )

    def validate_question_sources(self, value):
        for question in value:
            required_fields = [
                "exercise_id",
                "question_id",
                "title",
                "counter_in_exercise",
            ]
            for field in required_fields:
                if field not in question:
                    raise serializers.ValidationError(
                        "Question missing '{}'".format(field)
                    )
        return value

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
        assignees = validated_data.pop("assignments")
        new_exam = Exam.objects.create(**validated_data)
        # Create all of the new ExamAssignment
        for assignee in assignees:
            self._create_exam_assignment(
                exam=new_exam, collection=assignee["collection"]
            )
        return new_exam

    def _create_exam_assignment(self, **params):
        return ExamAssignment.objects.create(
            assigned_by=self.context["request"].user, **params
        )

    def update(self, instance, validated_data):
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
            assignees = validated_data.pop("assignments")
            current_group_ids = set(
                instance.assignments.values_list("collection__id", flat=True)
            )
            new_group_ids = set(x["collection"].id for x in assignees)

            for id in new_group_ids - current_group_ids:
                self._create_exam_assignment(
                    exam=instance, collection=Collection.objects.get(id=id)
                )

            ExamAssignment.objects.filter(
                exam_id=instance.id,
                collection_id__in=(current_group_ids - new_group_ids),
            ).delete()

        instance.save()
        return instance
