# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from django.conf.urls import include, url
from django.http import HttpResponse
from rest_framework import routers, viewsets

from . import api, models, serializers


class AbstractContentViewSet(viewsets.ModelViewSet):
    """
    abstract class for endpoints that return ContentMetadata objectsm in JSON.
    """
    model = models.ContentMetadata
    serializer_class = serializers.ContentMetadataSerializer

    def get_queryset(self):
        self.ch_id = self.request.GET['channel_id']
        self.cn = self.request.GET['content']


class AbstractFormatViewSet(viewsets.ModelViewSet):
    """
    abstract class for endpoints that return Format objects in JSON.
    """
    model = models.Format
    serializer_class = serializers.FormatSerializer

    def get_queryset(self):
        self.ch_id = self.request.GET['channel_id']
        self.cn = self.request.GET['content']


class AbstractFileViewSet(viewsets.ModelViewSet):
    """
    abstract class for endpoints that return File objects in JSON.
    """
    model = models.File
    serializer_class = serializers.FileSerializer

    def get_queryset(self):
        self.ch_id = self.request.GET['channel_id']
        self.cn = self.request.GET['content']


class GetContentWithIdViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(GetContentWithIdViewSet, self).get_queryset()
        return api.get_content_with_id(self.request.GET['content'], channel_id=self.ch_id)


class AncestorTopicsViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(AncestorTopicsViewSet, self).get_queryset()
        return api.get_ancestor_topics(channel_id=self.ch_id, content=self.cn)


class ImmediateChildrenViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(ImmediateChildrenViewSet, self).get_queryset()
        return api.immediate_children(channel_id=self.ch_id, content=self.cn)


class LeavesViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(LeavesViewSet, self).get_queryset()
        return api.leaves(channel_id=self.ch_id, content=self.cn)


class GetAllFormatsViewSet(AbstractFormatViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of Format objects
    """
    def get_queryset(self):
        super(GetAllFormatsViewSet, self).get_queryset()
        return api.get_all_formats(channel_id=self.ch_id, content=self.cn)


class GetAvailableFormatsViewSet(AbstractFormatViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of Format objects
    """
    def get_queryset(self):
        super(GetAvailableFormatsViewSet, self).get_queryset()
        return api.get_available_formats(channel_id=self.ch_id, content=self.cn)


class GetPossibleFormatsViewSet(AbstractFormatViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of Format objects
    """
    def get_queryset(self):
        super(GetPossibleFormatsViewSet, self).get_queryset()
        return api.get_possible_formats(channel_id=self.ch_id, content=self.cn)


class GetFilesForQualityViewSet(AbstractFileViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>, format_quality: <string>}
    :return: QuerySet of File obejcts
    """
    def get_queryset(self):
        super(GetFilesForQualityViewSet, self).get_queryset()
        return api.get_files_for_quality(channel_id=self.ch_id, content=self.cn, format_quality=self.request.GET['format_quality'])


class GetMissingFilesViewSet(AbstractFileViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of File objects
    """
    def get_queryset(self):
        super(GetMissingFilesViewSet, self).get_queryset()
        return api.get_missing_files(channel_id=self.ch_id, content=self.cn)


class GetAllPrerequisitesViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(GetAllPrerequisitesViewSet, self).get_queryset()
        return api.get_all_prerequisites(channel_id=self.ch_id, content=self.cn)


class GetAllRelatedViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(GetAllRelatedViewSet, self).get_queryset()
        return api.get_all_related(channel_id=self.ch_id, content=self.cn)


class ChildrenOfKindViewSet(AbstractContentViewSet):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content: <UUID string>, kind: <string>}
    :return: QuerySet of ContentMetadata objects
    """
    def get_queryset(self):
        super(ChildrenOfKindViewSet, self).get_queryset()
        return api.children_of_kind(channel_id=self.ch_id, content=self.cn, kind=self.request.GET['kind'])


def set_prerequisite_view(request, channel_id=None, content1=None, content2=None):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content1: <UUID string>, content2: <UUID string>}
    :return: html status
    """
    try:
        api.set_prerequisite(channel_id=channel_id, content1=content1, content2=content2)
        return HttpResponse(status=201)
    except Exception, e:
        return HttpResponse(str(e), status=500)

def set_is_related_view(request, channel_id=None, content1=None, content2=None):
    """
    front-end call need to supply data: {channel_id: <UUID string>, content1: <UUID string>, content2: <UUID string>}
    :return: html status
    """
    try:
        api.set_is_related(channel_id=channel_id, content1=content1, content2=content2)
        return HttpResponse(status=201)
    except Exception, e:
        return HttpResponse(str(e), status=500)


router = routers.DefaultRouter()
router.register(r'get_content_with_id', GetContentWithIdViewSet, base_name="contentmetadata-list")
router.register(r'get_ancestor_topics', AncestorTopicsViewSet, base_name="contentmetadata-list")
router.register(r'immediate_children', ImmediateChildrenViewSet, base_name="contentmetadata-list")
router.register(r'leaves', LeavesViewSet, base_name="contentmetadata-list")
router.register(r'get_all_formats', GetAllFormatsViewSet, base_name="format-list")
router.register(r'get_available_formats', GetAvailableFormatsViewSet, base_name="format-list")
router.register(r'get_possible_formats', GetPossibleFormatsViewSet, base_name="format-list")
router.register(r'get_files_for_quality', GetFilesForQualityViewSet, base_name="file-list")
router.register(r'get_missing_files', GetMissingFilesViewSet, base_name="file-list")
router.register(r'get_all_prerequisites', GetAllPrerequisitesViewSet, base_name="contentmetadata-list")
router.register(r'get_all_related', GetAllRelatedViewSet, base_name="contentmetadata-list")
router.register(r'children_of_kind', ChildrenOfKindViewSet, base_name="contentmetadata-list")

urlpatterns = [
    url(r'^content_api/', include(router.urls)),
    url(r'^content_api/set_prerequisite/(?P<channel_id>.*)/(?P<content1>.*)/(?P<content2>.*)/$', set_prerequisite_view),
    url(r'^content_api/set_is_related/(?P<channel_id>.*)/(?P<content1>.*)/(?P<content2>.*)/$', set_is_related_view),
]
