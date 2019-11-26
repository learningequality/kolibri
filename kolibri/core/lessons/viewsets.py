import json
from functools import partial
from itertools import chain

from django.db import connection
from django.db.models import CharField
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend

from .serializers import LessonSerializer
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.query import ArrayAgg
from kolibri.core.query import GroupConcat
from kolibri.core.query import process_uuid_aggregate


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class LessonPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Lesson POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        # Cannot have create assignments without creating the Lesson first,
        # so this doesn't try to validate the Lesson with a non-empty lesson_assignments list
        validated_data.pop("lesson_assignments")
        return request.user.can_create(model, validated_data)


def _map_lesson_classroom(item):
    return {
        "id": item.pop("collection__id"),
        "name": item.pop("collection__name"),
        "parent": item.pop("collection__parent_id"),
    }


class LessonViewset(ValuesViewset):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filter_fields = ("collection",)
    permission_classes = (LessonPermissions,)
    queryset = Lesson.objects.all().order_by("-date_created")

    values = (
        "id",
        "title",
        "description",
        "resources",
        "is_active",
        "collection",  # classroom
        "collection__id",
        "collection__name",
        "collection__parent_id",
        "created_by",
        "assignment_ids",
    )

    field_map = {
        "classroom": _map_lesson_classroom,
        "resources": lambda x: json.loads(x["resources"]),
        "assignment_ids": partial(process_uuid_aggregate, key="assignment_ids"),
    }

    def consolidate(self, items):
        assignment_ids = []
        for item in items:
            assignment_ids.extend(item["assignment_ids"])
        assignments = LessonAssignment.objects.filter(id__in=assignment_ids)
        if connection.vendor == "postgresql" and ArrayAgg is not None:
            assignments = assignments.annotate(
                learner_ids=ArrayAgg("collection__membership__user__id")
            )

            def _process_item(item):
                item["learner_ids"] = map(
                    lambda x: x.hex, filter(lambda x: x, item["learner_ids"])
                )
                return item

        else:
            assignments = assignments.values("id").annotate(
                learner_ids=GroupConcat(
                    "collection__membership__user__id", output_field=CharField()
                )
            )

            def _process_item(item):
                item["learner_ids"] = (
                    item["learner_ids"].split(",") if item["learner_ids"] else []
                )
                return item

        assignments = {
            a["id"]: _process_item(a)
            for a in assignments.values(
                "id",
                "collection",
                "learner_ids",
                "assigned_by",
                collection_kind=F("collection__kind"),
            )
        }
        for item in items:
            item_ids = item.pop("assignment_ids")
            item["lesson_assignments"] = [assignments[a] for a in item_ids]
            item["learner_ids"] = list(
                set(
                    chain.from_iterable(
                        a.pop("learner_ids") for a in item["lesson_assignments"]
                    )
                )
            )
        return items

    def annotate_queryset(self, queryset):
        if connection.vendor == "postgresql" and ArrayAgg is not None:
            return queryset.annotate(assignment_ids=ArrayAgg("lesson_assignments__id"))
        return queryset.values("id").annotate(
            assignment_ids=GroupConcat(
                "lesson_assignments__id", output_field=CharField()
            )
        )
