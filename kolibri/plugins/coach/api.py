import datetime

from django.db import connections
from django.db.models import Count
from django.db.models import F
from django.db.models import Q
from django.db.models import Sum
from django.db.utils import DatabaseError
from django.db.utils import OperationalError
from rest_framework import pagination
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from .serializers import LearnerNotificationSerializer
from .serializers import LessonReportSerializer
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.decorators import query_params_required
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationsLog
from kolibri.core.sqlite.utils import repair_sqlite_db

collection_kind_choices = tuple(
    [choice[0] for choice in collection_kinds.choices] + ["user"]
)


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"


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
        collection_id = view.kwargs.get("collection_id")

        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=collection_id)
            )
        except (Collection.DoesNotExist, ValueError):
            return False


@query_params_required(collection_id=str)
class ClassroomNotificationsViewset(viewsets.ReadOnlyModelViewSet):

    permission_classes = (ClassroomNotificationsPermissions,)
    serializer_class = LearnerNotificationSerializer
    pagination_class = OptionalPageNumberPagination
    pagination_class.page_size = 10

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

    def apply_learner_filter(self, query):
        """
        Filter the notifications by learner_id if applicable
        """
        learner_id = self.request.query_params.get("learner_id", None)
        if learner_id:
            return query.filter(user_id=learner_id)
        return query

    def remove_default_page_size(self):
        """
        This is a hack because DRF sets pagination always if pagination_class.page_size is set
        """
        if self.request.query_params.get("page", None) is None:
            self.paginator.page_size = None

    def get_queryset(self):
        """
        Returns the notifications in reverse-chronological order, filtered by the query parameters.
        By default it sends only notifications from the past day.
        If a 'page_size' parameter is used, that sets a maximum number of results.
        If a 'page' parameter is used, the past day limit is not applied.

        Some url examples:
        /coach/api/notifications/?collection_id=9da65157a8603788fd3db890d2035a9f
        /coach/api/notifications/?collection_id=9da65157a8603788fd3db890d2035a9f&after=8&page=2
        /coach/api/notifications/?page_size=5&page=2&collection_id=9da65157a8603788fd3db890d2035a9f&learner_id=94117bb5868a1ef529b8be60f17ff41a
        /coach/api/notifications/?collection_id=9da65157a8603788fd3db890d2035a9f&page=2

        :param: collection_id uuid: classroom or learner group identifier (mandatory)
        :param: learner_id uuid: user identifier
        :param: after integer: all the notifications after this id will be sent.
        :param: page_size integer: sets the number of notifications to provide for pagination (defaults: 10)
        :param: page integer: sets the page to provide when paginating.
        """
        collection_id = self.kwargs["collection_id"]

        if collection_id:
            try:
                collection = Collection.objects.get(pk=collection_id)
            except (Collection.DoesNotExist, ValueError):
                return []
        if collection.kind == collection_kinds.CLASSROOM:
            classroom_groups = list(LearnerGroup.objects.filter(parent=collection))
            classroom_groups += list(AdHocGroup.objects.filter(parent=collection))
            learner_groups = [group.id for group in classroom_groups]
            learner_groups.append(collection_id)
            notifications_query = LearnerProgressNotification.objects.filter(
                classroom_id__in=learner_groups
            )
        else:
            notifications_query = LearnerProgressNotification.objects.filter(
                classroom_id=collection_id
            )
        notifications_query = self.apply_learner_filter(notifications_query)
        after = self.check_after()
        self.remove_default_page_size()
        if after:
            notifications_query = notifications_query.filter(id__gt=after)
        elif self.request.query_params.get("page", None) is None:
            try:
                last_id_record = notifications_query.latest("id")
                # returns all the notifications 24 hours older than the latest
                last_24h = last_id_record.timestamp - datetime.timedelta(days=1)
                notifications_query = notifications_query.filter(
                    timestamp__gte=last_24h
                )
            except (LearnerProgressNotification.DoesNotExist):
                return []
            except DatabaseError:
                repair_sqlite_db(connections["notifications_db"])
                return []

        return notifications_query.order_by("-id")

    def list(self, request, *args, **kwargs):
        """
        It provides the list of ClassroomNotificationsViewset from DRF.
        Then it fetches and saves the needed information to know how many coaches
        are requesting notifications in the last five minutes
        """
        # Use super on the parent class to prevent an infinite recursion.
        try:
            response = super(viewsets.ReadOnlyModelViewSet, self).list(
                request, *args, **kwargs
            )
        except (OperationalError, DatabaseError):
            repair_sqlite_db(connections["notifications_db"])

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
            repair_sqlite_db(connections["notifications_db"])
        # if there are more than 10 notifications we limit the answer to 10
        if logged_notifications < 10:
            notification_info = NotificationsLog()
            notification_info.coach_id = request.user.id
            notification_info.save()
            NotificationsLog.objects.filter(timestamp__lt=logging_interval).delete()
        if "results" not in response.data:
            response.data = {
                "results": response.data,
                "coaches_polling": logged_notifications,
            }
        else:
            response.data["coaches_polling"] = logged_notifications
        return response


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
                base_queryset = queryset
                # Set starting queryset to null, then OR.
                queryset = AttemptLog.objects.none()
                for collection_id in collection_ids:
                    queryset |= HierarchyRelationsFilter(
                        base_queryset
                    ).filter_by_hierarchy(
                        ancestor_collection=collection_id, target_user=F("user")
                    )
                queryset = queryset.distinct()
        if group_id is not None:
            collection_id = group_id or classroom_id
            queryset = HierarchyRelationsFilter(queryset).filter_by_hierarchy(
                ancestor_collection=collection_id, target_user=F("user")
            )

        data = (
            queryset.values("item")
            .annotate(total=Count("correct"))
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
        queryset = ExamAttemptLog.objects.filter(
            Q(examlog__closed=True) | Q(examlog__exam__active=False), examlog__exam=pk
        )
        if group_id is not None:
            queryset = HierarchyRelationsFilter(queryset).filter_by_hierarchy(
                ancestor_collection=group_id, target_user=F("user")
            )
            collection_id = group_id
        else:
            collection_id = Exam.objects.get(pk=pk).collection_id
        data = queryset.values("item", "content_id").annotate(correct=Sum("correct"))

        # Instead of inferring the totals from the number of logs, use the total
        # number of people who submitted (if quiz is active) or started the exam
        # (if quiz is inactive) as our guide, as people who started the exam
        # but did not attempt the question are still important.
        total = (
            HierarchyRelationsFilter(
                ExamLog.objects.filter(
                    Q(closed=True) | Q(exam__active=False), exam_id=pk
                )
            )
            .filter_by_hierarchy(
                ancestor_collection=collection_id, target_user=F("user")
            )
            .count()
        )
        for datum in data:
            datum["total"] = total
        return Response(data)
