import datetime

from django.db.models import Q
from rest_framework import mixins
from rest_framework import pagination
from rest_framework import permissions
from rest_framework import viewsets

from .serializers import ContentReportSerializer
from .serializers import ContentSummarySerializer
from .serializers import LearnerNotificationSerializer
from .serializers import LessonReportSerializer
from .serializers import UserReportSerializer
from .utils.return_users import get_members_or_user
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.decorators import query_params_required
from kolibri.core.lessons.models import Lesson
from kolibri.core.notifications.models import LearnerProgressNotification


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


@query_params_required(channel_id=str, content_node_id=str, collection_kind=collection_kind_choices, collection_id=str)
class ReportBaseViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):

    permission_classes = (KolibriReportPermissions,)


class UserReportViewSet(ReportBaseViewSet):

    pagination_class = OptionalPageNumberPagination
    serializer_class = UserReportSerializer

    def get_queryset(self):
        assert 'user' != self.kwargs['collection_kind'], 'only a `collection` should be passed to this endpoint'
        return get_members_or_user(self.kwargs['collection_kind'], self.kwargs['collection_id'])


class ContentReportViewSet(ReportBaseViewSet):

    pagination_class = OptionalPageNumberPagination
    serializer_class = ContentReportSerializer

    def get_queryset(self):
        content_node_id = self.kwargs['content_node_id']
        return ContentNode.objects.filter(Q(parent=content_node_id) & Q(available=True)).order_by('lft')


@query_params_required(channel_id=str, collection_kind=collection_kind_choices, collection_id=str)
class ContentSummaryViewSet(viewsets.ReadOnlyModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    serializer_class = ContentSummarySerializer

    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        return ContentNode.objects.filter(Q(channel_id=channel_id)).order_by('lft')


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

    def get_queryset(self):
        """
        Returns the notifications according to the params provided in the url
        By default it sends today's notifications. If page parameter is used,
        notifications are sent in reverse order, and the date limitation is removed, thus all the
        existing notifications fulfilling the other conditions are sent.

        Some url examples:
        /coach/api/notifications/?collection_id=9da65157a8603788fd3db890d2035a9f&after=8&page=2
        /coach/api/notifications/?page_size=5&page=2&collection_id=9da65157a8603788fd3db890d2035a9f&learner_id=94117bb5868a1ef529b8be60f17ff41a
        /coach/api/notifications/?collection_id=9da65157a8603788fd3db890d2035a9f&page=2

        :param: collection_id uuid: classroom or learner group identifier (mandatory)
        :param: learner_id uuid: user identifier
        :param: after integer: all the notifications after this id will be sent.
        :param: page_size integer: sets the number of notifications to provide for pagination (defaults: 10)
        :param: page integer: sets the page to provide when paginating. Notifications are sent in reverse order.

        """
        classroom_id = self.kwargs['collection_id']
        notifications_after = self.request.query_params.get('after', None)
        learner_id = self.request.query_params.get('learner_id', None)
        after = None
        if notifications_after:
            try:
                after = int(notifications_after)
            except ValueError:
                pass  # if after has not a valid format, let's not use it

        if classroom_id:
            try:
                Collection.objects.get(pk=classroom_id)
            except (Collection.DoesNotExist, ValueError):
                return []
        if learner_id:
            try:
                FacilityUser.objects.get(id=learner_id)
            except (FacilityUser.DoesNotExist, ValueError):
                return []

        notifications_query = LearnerProgressNotification.objects.filter(classroom_id=classroom_id)
        paginating = self.request.query_params.get('page', None)
        if learner_id:
            notifications_query = notifications_query.filter(user_id=learner_id)
        if after:
            notifications_query = notifications_query.filter(id__gt=after)
        elif not paginating:
            today = datetime.datetime.combine(datetime.datetime.now(), datetime.time(0))
            notifications_query = notifications_query.filter(timestamp__gte=today)

        order_field = '-id' if paginating else 'id'
        return notifications_query.order_by(order_field)
