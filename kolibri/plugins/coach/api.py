import datetime

from django.db import connections
from django.db.models import Count
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Sum
from django.db.utils import DatabaseError
from django.db.utils import OperationalError
from django.http import Http404
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DateTimeFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from .serializers import LessonReportSerializer
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.decorators import query_params_required
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationsLog
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS

collection_kind_choices = tuple(
    [choice[0] for choice in collection_kinds.choices] + ["user"]
)


class LessonReportPermissions(permissions.BasePermission):
    """
    List - check if requester has coach/admin permissions on whole facility.
    Detail - check if requester has permissions on the Classroom.
    """

    def has_permission(self, request, view):
        report_pk = view.kwargs.get("pk", None)
        if report_pk is None:
            collection_id = request.user.facility_id
        else:
            collection_id = Lesson.objects.get(pk=report_pk).collection.id

        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=collection_id)
            )
        except (Collection.DoesNotExist, ValueError):
            return False


class LessonReportViewset(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.IsAuthenticated, LessonReportPermissions)
    serializer_class = LessonReportSerializer
    queryset = Lesson.objects.all()


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
        if self.request.query_params.get("limit", None):
            return queryset.filter(timestamp__lt=value)
        return queryset


@query_params_required(classroom_id=str)
class ClassroomNotificationsViewset(ValuesViewset):

    permission_classes = (ClassroomNotificationsPermissions,)

    values = (
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
        "notification_object",
        "notification_event",
    )

    field_map = {"object": "notification_object", "event": "notification_event"}

    filter_backends = (DjangoFilterBackend,)
    filterset_class = ClassroomNotificationsFilter

    def check_limit(self):
        """
        Check if limit parameter must be used for the query
        """
        notifications_limit = self.request.query_params.get("limit", None)
        limit = None
        if notifications_limit:
            try:
                limit = int(notifications_limit)
            except ValueError:
                pass  # if limit has not a valid format, let's not use it
        return limit

    def get_queryset(self):
        classroom_id = self.kwargs.get("classroom_id", None)

        if classroom_id is None:
            return LearnerProgressNotification.objects.none()

        return LearnerProgressNotification.objects

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)

        classroom_id = self.kwargs.get("classroom_id", None)
        if classroom_id is None:
            return LearnerProgressNotification.objects.none()

        limit = self.check_limit()
        after = self.request.query_params.get("after", None)
        before = self.request.query_params.get("before", None) if limit else None

        if not after and not before:
            try:
                last_record = queryset.latest("timestamp")
                # returns all the notifications 24 hours older than the latest
                last_24h = last_record.timestamp - datetime.timedelta(days=1)
                queryset = queryset.filter(timestamp__gte=last_24h)
            except (LearnerProgressNotification.DoesNotExist):
                return LearnerProgressNotification.objects.none()
            except DatabaseError:
                repair_sqlite_db(connections[NOTIFICATIONS])
                return LearnerProgressNotification.objects.none()

        return queryset

    def annotate_queryset(self, queryset):
        queryset = queryset.order_by("-timestamp")
        limit = self.check_limit()
        if limit:
            return queryset[:limit]
        return queryset

    def list(self, request, *args, **kwargs):
        """
        It provides the list of ClassroomNotificationsViewset from DRF.
        Then it fetches and saves the needed information to know how many coaches
        are requesting notifications in the last five minutes
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
        except (OperationalError, DatabaseError):
            repair_sqlite_db(connections[NOTIFICATIONS])

        # L
        logging_interval = datetime.datetime.now() - datetime.timedelta(minutes=5)
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
        # if there are more than 10 notifications we limit the answer to 10
        if logged_notifications < 10:
            notification_info = NotificationsLog()
            notification_info.coach_id = request.user.id
            notification_info.save()
            NotificationsLog.objects.filter(timestamp__lt=logging_interval).delete()

        more_results = False
        limit = self.check_limit()
        if limit:
            # If we are limiting responses, check if more results are available
            more_results = queryset.order_by("-timestamp")[limit:].exists()

        return Response(
            {
                "results": self.serialize(queryset),
                "coaches_polling": logged_notifications,
                "more_results": more_results,
            }
        )


class ExerciseDifficultiesPermissions(permissions.BasePermission):

    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        collection_id = group_id or classroom_id
        lesson_id = request.GET.get("lesson_id", None)
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        if lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
                classroom = lesson.collection
                return request.user.has_role_for(allowed_roles, classroom)
            except (
                FacilityUser.DoesNotExist,
                Collection.DoesNotExist,
                Lesson.DoesNotExist,
                ValueError,
            ):
                return False
        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=collection_id)
            )
        except (FacilityUser.DoesNotExist, Collection.DoesNotExist, ValueError):
            return False


# Define a base class so that the inherited class is properly introspectable,
# rather than being the result of our wrapping
@query_params_required(classroom_id=str)
class BaseExerciseDifficultQuestionsViewset(viewsets.ViewSet):
    pass


class ExerciseDifficultQuestionsViewset(BaseExerciseDifficultQuestionsViewset):
    permission_classes = (permissions.IsAuthenticated, ExerciseDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular exercise.
        pk maps to the content_id of the exercise in question.
        """
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        lesson_id = request.GET.get("lesson_id", None)
        queryset = AttemptLog.objects.filter(masterylog__summarylog__content_id=pk)
        if lesson_id is not None:
            collection_ids = Lesson.objects.get(
                id=lesson_id
            ).lesson_assignments.values_list("collection_id", flat=True)
            if group_id is not None:
                if (
                    group_id not in collection_ids
                    and classroom_id not in collection_ids
                ):
                    # In the special case that the group is not in the lesson assignments
                    # nor the containing classroom, just return an empty queryset.
                    queryset = AttemptLog.objects.none()
            else:
                # Only filter by all the collections in the lesson if we are not also
                # filtering by a specific group. Otherwise the group should be sufficient.
                queryset = queryset.filter(
                    user__memberships__collection_id__in=collection_ids
                )
        if group_id is not None:
            collection_id = group_id or classroom_id
            queryset = queryset.filter(user__memberships__collection_id=collection_id)

        data = (
            # Use a subquery to prevent duplication of attempt logs due to the double JOIN
            # if we have multiple collections that a user is a member of
            AttemptLog.objects.filter(id__in=queryset.values_list("id", flat=True))
            .values("item")
            .annotate(
                total=Count(
                    "correct",
                )
            )
            .annotate(correct=Sum("correct"))
        )
        return Response(data)


class QuizDifficultiesPermissions(permissions.BasePermission):

    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        exam_id = view.kwargs.get("pk", None)
        if exam_id is None:
            return False
        try:
            collection = Exam.objects.get(id=exam_id).collection
        except (Exam.DoesNotExist, ValueError):
            return False
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            return request.user.has_role_for(allowed_roles, collection)
        except (FacilityUser.DoesNotExist, ValueError):
            return False


class QuizDifficultQuestionsViewset(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated, QuizDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular quiz.
        """
        group_id = request.GET.get("group_id", None)
        # Only return logs when the learner has submitted the Quiz OR
        # the coach has deactivated the Quiz. Do not return logs when Quiz is still
        # in-progress.
        try:
            quiz = Exam.objects.all().values("active", "collection_id").get(pk=pk)
        except Exam.DoesNotExist:
            raise Http404
        quiz_active = quiz["active"]
        queryset = AttemptLog.objects.filter(sessionlog__content_id=pk)
        if quiz_active:
            queryset = queryset.filter(masterylog__complete=True)
        if group_id is not None:
            queryset = queryset.filter(
                user__memberships__collection_id=group_id
            ).distinct()
            collection_id = group_id
        else:
            collection_id = quiz["collection_id"]
        data = queryset.values("item").annotate(correct=Sum("correct"))

        # Instead of inferring the totals from the number of logs, use the total
        # number of people who submitted (if quiz is active) or started the exam
        # (if quiz is inactive) as our guide, as people who started the exam
        # but did not attempt the question are still important.
        total_queryset = MasteryLog.objects.filter(summarylog__content_id=pk)
        if quiz_active:
            total_queryset = total_queryset.filter(complete=True)
        total = (
            total_queryset.filter(user__memberships__collection_id=collection_id)
            .distinct()
            .count()
        )
        for datum in data:
            datum["total"] = total
        return Response(data)


class PracticeQuizDifficultQuestionsViewset(BaseExerciseDifficultQuestionsViewset):
    permission_classes = (permissions.IsAuthenticated, ExerciseDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular practice quiz.
        pk maps to the content_id of the practice quiz in question.
        """
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        lesson_id = request.GET.get("lesson_id", None)
        # For practice quizzes we only look at complete MasteryLogs because there practice quiz
        # itself can never be made inactive, unlike for a coach assigned quiz (see above)
        masterylog_queryset = MasteryLog.objects.filter(
            summarylog__content_id=pk, complete=True, mastery_level__lt=0
        )
        attemptlog_queryset = AttemptLog.objects.all()
        if lesson_id is not None:
            collection_ids = Lesson.objects.get(
                id=lesson_id
            ).lesson_assignments.values_list("collection_id", flat=True)
            if group_id is not None:
                if (
                    group_id not in collection_ids
                    and classroom_id not in collection_ids
                ):
                    # In the special case that the group is not in the lesson assignments
                    # nor the containing classroom, just return an empty queryset.
                    attemptlog_queryset = AttemptLog.objects.none()
            else:
                # Only filter by all the collections in the lesson if we are not also
                # filtering by a specific group. Otherwise the group should be sufficient.
                masterylog_queryset = masterylog_queryset.filter(
                    user__memberships__collection_id__in=collection_ids
                )
        if group_id is not None:
            collection_id = group_id or classroom_id
            masterylog_queryset = masterylog_queryset.filter(
                user__memberships__collection_id=collection_id
            )

        masterylog_queryset = masterylog_queryset.filter(
            id__in=Subquery(
                MasteryLog.objects.all()
                .order_by(F("completion_timestamp").desc(nulls_last=True))
                .filter(
                    user_id=OuterRef("user_id"),
                    summarylog__content_id=pk,
                    mastery_level__lt=0,
                    complete=True,
                )
                .values_list("id")[:1]
            )
        )

        masterylog_queryset = masterylog_queryset.values_list("id", flat=True)

        attemptlog_queryset = attemptlog_queryset.filter(
            masterylog_id__in=masterylog_queryset
        )

        data = attemptlog_queryset.values("item").annotate(correct=Sum("correct"))

        # Instead of inferring the totals from the number of attempt logs, use the total
        # number of people who have a completed try on the practice quiz
        total = masterylog_queryset.distinct().count()
        for datum in data:
            datum["total"] = total
        return Response(data)
