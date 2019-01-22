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

    def get_queryset(self):
        classroom_id = self.kwargs['collection_id']
        notifications_after = self.request.query_params.get('after', None)
        after = None
        if notifications_after:
            try:
                after = int(notifications_after)
            except ValueError:
                pass  # if after has not a valid format, let's not use it

        try:
            Collection.objects.get(pk=classroom_id)
        except (Collection.DoesNotExist, ValueError):
            return None
        notifications_query = LearnerProgressNotification.objects.filter(classroom_id=classroom_id)
        if after:
            notifications_query = notifications_query.filter(id__gt=after)
        else:
            today = datetime.datetime.combine(datetime.datetime.now(), datetime.time(0))
            notifications_query = notifications_query.filter(timestamp__gte=today)
        return notifications_query.order_by('id')
