import datetime

from django.db.models import Count
from django.db.models import F
from django.db.models import Sum
from rest_framework import pagination
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from .serializers import LearnerNotificationSerializer
from .serializers import LessonReportSerializer
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.decorators import query_params_required
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationsLog

collection_kind_choices = tuple([choice[0] for choice in collection_kinds.choices] + ['user'])


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """
    page_size = None
    page_size_query_param = "page_size"


class KolibriReportPermissions(permissions.BasePermission):

    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        if isinstance(view, LessonReportViewset):
            report_pk = view.kwargs.get('pk', None)
            if report_pk is None:
                # If requesting list view, check if requester has coach/admin permissions on whole facility
                collection_kind = 'facility'
                collection_or_user_pk = request.user.facility_id
            else:
                # If requesting detail view, only check if requester has permissions on the Classroom
                collection_kind = 'classroom'
                collection_or_user_pk = Lesson.objects.get(pk=report_pk).collection.id

        else:
            if isinstance(view, ClassroomNotificationsViewset):
                collection_kind = 'classroom'
            else:
                collection_kind = view.kwargs.get('collection_kind', 'user')
            collection_or_user_pk = view.kwargs.get('collection_id', view.kwargs.get('pk'))

        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            if 'user' == collection_kind:
                return request.user.has_role_for(allowed_roles, FacilityUser.objects.get(pk=collection_or_user_pk))
            else:
                return request.user.has_role_for(allowed_roles, Collection.objects.get(pk=collection_or_user_pk))
        except (FacilityUser.DoesNotExist, Collection.DoesNotExist, ValueError):
            return False


class LessonReportViewset(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.IsAuthenticated, KolibriReportPermissions,)
    serializer_class = LessonReportSerializer
    queryset = Lesson.objects.all()


@query_params_required(collection_id=str)
class ClassroomNotificationsViewset(viewsets.ReadOnlyModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    serializer_class = LearnerNotificationSerializer
    pagination_class = OptionalPageNumberPagination
    pagination_class.page_size = 10

    def check_after(self):
        """
        Check if after parameter must be used for the query
        """
        notifications_after = self.request.query_params.get('after', None)
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
        learner_id = self.request.query_params.get('learner_id', None)
        if learner_id:
            return query.filter(user_id=learner_id)
        return query

    def remove_default_page_size(self):
        """
        This is a hack because DRF sets pagination always if pagination_class.page_size is set
        """
        if self.request.query_params.get('page', None) is None:
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
        collection_id = self.kwargs['collection_id']

        if collection_id:
            try:
                collection = Collection.objects.get(pk=collection_id)
            except (Collection.DoesNotExist, ValueError):
                return []
        if collection.kind == collection_kinds.CLASSROOM:
            classroom_groups = LearnerGroup.objects.filter(parent=collection)
            learner_groups = [group.id for group in classroom_groups]
            learner_groups.append(collection_id)
            notifications_query = LearnerProgressNotification.objects.filter(classroom_id__in=learner_groups)
        else:
            notifications_query = LearnerProgressNotification.objects.filter(classroom_id=collection_id)
        notifications_query = self.apply_learner_filter(notifications_query)
        after = self.check_after()
        self.remove_default_page_size()
        if after:
            notifications_query = notifications_query.filter(id__gt=after)
        elif self.request.query_params.get('page', None) is None:
            try:
                last_id_record = notifications_query.latest('id')
                # returns all the notifications 24 hours older than the latest
                last_24h = last_id_record.timestamp - datetime.timedelta(days=1)
                notifications_query = notifications_query.filter(timestamp__gte=last_24h)
            except (LearnerProgressNotification.DoesNotExist):
                return []

        return notifications_query.order_by('-id')

    def list(self, request, *args, **kwargs):
        """
        It provides the list of ClassroomNotificationsViewset from DRF.
        Then it fetches and saves the needed information to know how many coaches
        are requesting notifications in the last five minutes
        """
        # Use super on the parent class to prevent an infinite recursion.
        response = super(viewsets.ReadOnlyModelViewSet, self).list(request, *args, **kwargs)

        # L
        logging_interval = datetime.datetime.now() - datetime.timedelta(minutes=5)
        logged_notifications = (
            NotificationsLog.objects.filter(timestamp__gte=logging_interval).values('coach_id').distinct().count()
        )
        # if there are more than 10 notifications we limit the answer to 10
        if logged_notifications < 10:
            notification_info = NotificationsLog()
            notification_info.coach_id = request.user.id
            notification_info.save()
            NotificationsLog.objects.filter(timestamp__lt=logging_interval).delete()
        if 'results' not in response.data:
            response.data = {'results': response.data, 'coaches_polling': logged_notifications}
        else:
            response.data['coaches_polling'] = logged_notifications
        return response


class DifficultiesPermissions(permissions.BasePermission):

    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        collection_id = view.kwargs.get('collection_id', None)
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            return request.user.has_role_for(allowed_roles, Collection.objects.get(pk=collection_id))
        except (FacilityUser.DoesNotExist, Collection.DoesNotExist, ValueError):
            return False


@query_params_required(collection_id=str)
class BaseDifficultQuestionsViewset(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated, DifficultiesPermissions,)


class ExerciseDifficultQuestionsViewset(BaseDifficultQuestionsViewset):

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular exercise.
        pk maps to the content_id of the exercise in question.
        """
        collection_id = self.kwargs['collection_id']
        queryset = AttemptLog.objects.filter(masterylog__summarylog__content_id=pk)
        queryset = HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=collection_id,
            target_user=F("user"),
        )
        data = queryset.values('item').annotate(total=Count('correct')).annotate(correct=Sum('correct'))
        return Response(data)


class QuizDifficultQuestionsViewset(BaseDifficultQuestionsViewset):

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular quiz.
        """
        collection_id = self.kwargs['collection_id']
        queryset = ExamAttemptLog.objects.filter(examlog__exam=pk)
        queryset = HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=collection_id,
            target_user=F("user"),
        )
        data = queryset.values('item', 'content_id').annotate(correct=Sum('correct'))

        # Instead of inferring the totals from the number of logs, use the total
        # number of people who took the exam as our guide, as people who started the exam
        # but did not attempt the question, are still important.
        total = HierarchyRelationsFilter(ExamLog.objects.filter(exam_id=pk)).filter_by_hierarchy(
            ancestor_collection=collection_id,
            target_user=F("user"),
        ).count()
        for datum in data:
            datum['total'] = total
        return Response(data)
