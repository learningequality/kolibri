from datetime import timedelta

from django.db import connections
from django.db.utils import DatabaseError
from django.db.utils import OperationalError
from django.utils.functional import cached_property
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DateTimeFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from rest_framework import permissions
from rest_framework import serializers
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.decorators import query_params_required
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationsLog
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS
from kolibri.utils.time_utils import local_now


class ClassroomNotificationsPermissions(permissions.BasePermission):
    """
    Allow only users with admin/coach permissions on a collection.
    """

    def has_permission(self, request, view):
        classroom_id = view.kwargs.get("classroom_id")

        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=classroom_id)
            )
        except (Collection.DoesNotExist, ValueError):
            return False


class ClassroomNotificationsFilter(FilterSet):
    classroom_id = UUIDFilter(field_name="classroom_id")
    after = DateTimeFilter(field_name="timestamp", lookup_expr="gt")
    before = DateTimeFilter(
        field_name="timestamp", lookup_expr="lt", method="filter_before"
    )
    learner_id = UUIDFilter(field_name="user_id")
    group_id = CharFilter(field_name="assignment_collections", lookup_expr="contains")

    class Meta:
        model = LearnerProgressNotification
        fields = ["before", "after", "classroom_id", "learner_id", "group_id"]

    def filter_before(self, queryset, name, value):
        # Don't allow arbitrary backwards lookups
        if self.request.query_params.get("limit"):
            return queryset.filter(timestamp__lt=value)
        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        after = self.request.query_params.get("after")
        limit = self.request.query_params.get("limit")
        before_active = limit and self.request.query_params.get("before")
        if not after and not before_active:
            try:
                last_record = queryset.latest("timestamp")
                # returns all the notifications 24 hours older than the latest
                last_24h = last_record.timestamp - timedelta(days=1)
                queryset = queryset.filter(timestamp__gte=last_24h)
            except LearnerProgressNotification.DoesNotExist:
                return LearnerProgressNotification.objects.none()
            except DatabaseError:
                repair_sqlite_db(connections[NOTIFICATIONS])
                return LearnerProgressNotification.objects.none()
        return queryset


class ClassroomNotificationsSerializer(serializers.ModelSerializer):
    object = serializers.CharField(source="notification_object", read_only=True)
    event = serializers.CharField(source="notification_event", read_only=True)

    class Meta:
        model = LearnerProgressNotification
        fields = (
            "id",
            "timestamp",
            "user_id",
            "classroom_id",
            "lesson_id",
            "assignment_collections",
            "reason",
            "quiz_id",
            "quiz_num_correct",
            "quiz_num_answered",
            "contentnode_id",
            "object",
            "event",
        )


@query_params_required(classroom_id=str)
class ClassroomNotificationsViewset(ValuesViewset):
    permission_classes = (ClassroomNotificationsPermissions,)

    filter_backends = (DjangoFilterBackend,)
    filterset_class = ClassroomNotificationsFilter
    serializer_class = ClassroomNotificationsSerializer

    @cached_property
    def _limit(self):
        try:
            return int(self.request.query_params["limit"])
        except (KeyError, ValueError):
            return None

    def get_queryset(self):
        return LearnerProgressNotification.objects.all()

    def annotate_queryset(self, queryset):
        queryset = queryset.order_by("-timestamp")
        if self._limit:
            return queryset[: self._limit]
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
        except (OperationalError, DatabaseError):
            if NOTIFICATIONS in connections:
                repair_sqlite_db(connections[NOTIFICATIONS])
            queryset = LearnerProgressNotification.objects.none()

        logging_interval = local_now() - timedelta(minutes=5)
        try:
            logged_notifications = (
                NotificationsLog.objects.filter(timestamp__gte=logging_interval)
                .values("coach_id")
                .distinct()
                .count()
            )
        except (OperationalError, DatabaseError):
            logged_notifications = 0
            repair_sqlite_db(connections[NOTIFICATIONS])
        # Throttle writes: only log this coach's poll if fewer than 10 distinct
        # coaches are already recorded in the last 5 minutes, preventing excessive
        # SQLite writes under high coach load.
        if logged_notifications < 10:
            NotificationsLog.objects.create(coach_id=request.user.id)
            NotificationsLog.objects.filter(timestamp__lt=logging_interval).delete()

        more_results = bool(self._limit) and queryset[self._limit :].exists()

        return Response(
            {
                "results": self.serialize(queryset),
                "coaches_polling": logged_notifications,
                "more_results": more_results,
            }
        )
