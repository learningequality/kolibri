from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import LessonSerializer
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.api import _ensure_raw_dict
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.query import annotate_array_aggregate


class LessonPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Lesson POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        # Cannot have create assignments without creating the Lesson first,
        # so this doesn't try to validate the Lesson with a non-empty assignments list
        validated_data.pop("assignments", [])
        validated_data.pop("learner_ids", [])
        return request.user.can_create(model, validated_data)


class LessonViewset(ValuesViewset):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filterset_fields = ("collection", "id")
    permission_classes = (LessonPermissions,)
    queryset = Lesson.objects.all().order_by("-date_created")

    def consolidate(self, items, queryset):
        if not items:
            return items
        adhoc_assignments = LessonAssignment.objects.filter(
            lesson_id__in=[item["id"] for item in items],
            collection__kind=ADHOCLEARNERSGROUP,
        )
        adhoc_assignments = annotate_array_aggregate(
            adhoc_assignments,
            # Filter excludes soft-deleted users from learner_ids (#444f7abf).
            filter=FacilityUser.get_is_active_q("collection__membership"),
            learner_ids="collection__membership__user_id",
        )
        adhoc_assignments = {
            a["lesson"]: a
            for a in adhoc_assignments.values("collection", "lesson", "learner_ids")
        }
        for item in items:
            if item["id"] in adhoc_assignments:
                adhoc_assignment = adhoc_assignments[item["id"]]
                item["learner_ids"] = adhoc_assignment["learner_ids"]
                item["assignments"] = [
                    i
                    for i in item["assignments"]
                    if i != adhoc_assignment["collection"]
                ]
            else:
                item["learner_ids"] = []
            item["resources"] = item["resources"] or []
        return items

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(
            queryset, lesson_assignment_collections="lesson_assignments__collection"
        )

    @action(detail=False)
    def size(self, request, **kwargs):
        lessons = self.filter_queryset(self.get_queryset())
        lessons_set = []
        for lesson in lessons:
            resource_nodes = ContentNode.objects.filter(
                id__in=[r["contentnode_id"] for r in lesson.resources]
            )
            lessons_set.append({lesson.id: total_file_size(resource_nodes)})

        return Response(lessons_set)
