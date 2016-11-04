from kolibri.auth.constants import collection_kinds
from kolibri.auth.models import FacilityUser
from kolibri.content.models import ContentNode
from kolibri.logger.models import ContentSummaryLog
from rest_framework import pagination, permissions, viewsets

from .serializers import ContentReportSerializer, UserReportSerializer
from .utils.return_users import get_collection_or_user


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
        return request.user.can_read(get_collection_or_user(view.kwargs))


class UserReportViewSet(viewsets.ModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    pagination_class = OptionalPageNumberPagination
    serializer_class = UserReportSerializer

    def get_queryset(self):
        assert any(self.kwargs['collection_kind'] in kind for kind in collection_kinds.choices)
        return get_collection_or_user(self.kwargs)


class ContentReportViewSet(viewsets.ModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    pagination_class = OptionalPageNumberPagination
    serializer_class = ContentReportSerializer

    def get_queryset(self):
        topic_id = self.kwargs['topic_id']
        return ContentNode.objects.filter(parent=topic_id)


class ContentSummaryViewSet(viewsets.ModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    serializer_class = ContentReportSerializer

    def get_queryset(self):
        return ContentNode.objects.all()


class UserSummaryViewSet(viewsets.ModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    serializer_class = UserReportSerializer

    def get_queryset(self):
        return FacilityUser.objects.all()


class RecentReportViewSet(viewsets.ModelViewSet):

    permission_classes = (KolibriReportPermissions,)
    pagination_class = OptionalPageNumberPagination
    serializer_class = ContentReportSerializer

    def get_queryset(self):
        query_node = ContentNode.objects.get(pk=self.kwargs['topic_id'])
        recent_content_items = ContentSummaryLog.objects.filter_by_topic(query_node).order_by('end_timestamp').values_list('content_id')
        return ContentNode.objects.filter(content_id__in=recent_content_items)
