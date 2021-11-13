import datetime

from django.db import connections
from django.db.models import Count
from django.db.models import Sum
from django.db.utils import DatabaseError
from django.db.utils import OperationalError
from django.http import Http404
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

    def check_after(self):
        """
        Check if after parameter must be used for the query
        """
        notifications_after = self.request.query_params.get("after", None)
        after = None
        if notifications_after:
            try:
                after = int(notifications_after)
            except ValueError:
                pass  # if after has not a valid format, let's not use it
        return after

    def check_before(self):
        """
        Check if before parameter must be used for the query
        """
        notifications_before = self.request.query_params.get("before", None)
        before = None
        if notifications_before:
            try:
                before = int(notifications_before)
            except ValueError:
                pass  # if before has not a valid format, let's not use it
        return before

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

    def apply_learner_filter(self, query):
        """
        Filter the notifications by learner_id if applicable
        """
        learner_id = self.request.query_params.get("learner_id", None)
        if learner_id:
            return query.filter(user_id=learner_id)
        return query

    def apply_group_filter(self, query):
        """
        Filter the notifications by group_id if applicable
        """
        group_id = self.request.query_params.get("group_id", None)
        if group_id:
            return query.filter(assignment_collections__contains=group_id)
        return query

    def get_queryset(self):
        """
        Returns the notifications in reverse-chronological order, filtered by the query parameters.
        By default it sends only notifications from the past day.
        If a 'page_size' parameter is used, that sets a maximum number of results.
        If a 'page' parameter is used, the past day limit is not applied.

        Some url examples:
        /coach/api/notifications/?classroom_id=9da65157a8603788fd3db890d2035a9f
        /coach/api/notifications/?classroom_id=9da65157a8603788fd3db890d2035a9f&after=8&limit=10
        /coach/api/notifications/?limit=5&classroom_id=9da65157a8603788fd3db890d2035a9f&learner_id=94117bb5868a1ef529b8be60f17ff41a
        /coach/api/notifications/?classroom_id=9da65157a8603788fd3db890d2035a9f

        :param: classroom_id uuid: classroom or learner group identifier (mandatory)
        :param: learner_id uuid: user identifier
        :param: group_id uuid: group identifier
        :param: after integer: all the notifications after this id will be sent.
        :param: limit integer: sets the number of notifications to provide
        """
        classroom_id = self.kwargs["classroom_id"]

        notifications_query = LearnerProgressNotification.objects.filter(
            classroom_id=classroom_id
        )
        notifications_query = self.apply_learner_filter(notifications_query)
        notifications_query = self.apply_group_filter(notifications_query)
        after = self.check_after()
        if after:
            notifications_query = notifications_query.filter(id__gt=after)
        before = self.check_before()

        if not after and not before:
            try:
                last_id_record = notifications_query.latest("id")
                # returns all the notifications 24 hours older than the latest
                last_24h = last_id_record.timestamp - datetime.timedelta(days=1)
                notifications_query = notifications_query.filter(
                    timestamp__gte=last_24h
                )
            except (LearnerProgressNotification.DoesNotExist):
                return LearnerProgressNotification.objects.none()
            except DatabaseError:
                repair_sqlite_db(connections[NOTIFICATIONS])
                return LearnerProgressNotification.objects.none()

        limit = self.check_limit()
        if before and limit:
            # Don't allow arbitrary backwards lookups
            notifications_query = notifications_query.filter(id__lt=before)

        return notifications_query

    def annotate_queryset(self, queryset):
        queryset = queryset.order_by("-id")
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
            more_results = queryset.order_by("-id")[limit:].exists()

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
        except Exam.DoesNotExist:
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
