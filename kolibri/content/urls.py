# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from django.http import HttpResponse
from rest_framework import viewsets

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
    def get_queryset(self):
        super(GetContentWithIdViewSet, self).get_queryset()
        return api.get_content_with_id(self.request.GET['content'], channel_id=self.ch_id)


class AncestorTopicsViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(AncestorTopicsViewSet, self).get_queryset()
        return api.get_ancestor_topics(channel_id=self.ch_id, content=self.cn)


class ImmediateChildrenViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(ImmediateChildrenViewSet, self).get_queryset()
        return api.immediate_children(channel_id=self.ch_id, content=self.cn)


class LeavesViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(LeavesViewSet, self).get_queryset()
        return api.leaves(channel_id=self.ch_id, content=self.cn)


class GetAllFormatsViewSet(AbstractFormatViewSet):
    def get_queryset(self):
        super(GetAllFormatsViewSet, self).get_queryset()
        return api.get_all_formats(channel_id=self.ch_id, content=self.cn)


class GetAvailableFormatsViewSet(AbstractFormatViewSet):
    def get_queryset(self):
        super(GetAvailableFormatsViewSet, self).get_queryset()
        return api.get_available_formats(channel_id=self.ch_id, content=self.cn)


class GetPossibleFormatsViewSet(AbstractFormatViewSet):
    def get_queryset(self):
        super(GetPossibleFormatsViewSet, self).get_queryset()
        return api.get_possible_formats(channel_id=self.ch_id, content=self.cn)


class GetFilesForQualityViewSet(AbstractFileViewSet):
    def get_queryset(self):
        super(GetFilesForQualityViewSet, self).get_queryset()
        return api.get_files_for_quality(channel_id=self.ch_id, content=self.cn, format_quality=self.request.GET['format_quality'])


class GetMissingFilesViewSet(AbstractFileViewSet):
    def get_queryset(self):
        super(GetMissingFilesViewSet, self).get_queryset()
        return api.get_missing_files(channel_id=self.ch_id, content=self.cn)


class GetAllPrerequisitesViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(GetAllPrerequisitesViewSet, self).get_queryset()
        return api.get_all_prerequisites(channel_id=self.ch_id, content=self.cn)


class GetAllRelatedViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(GetAllRelatedViewSet, self).get_queryset()
        return api.get_all_related(channel_id=self.ch_id, content=self.cn)


class ChildrenOfKindViewSet(AbstractContentViewSet):
    def get_queryset(self):
        super(ChildrenOfKindViewSet, self).get_queryset()
        return api.children_of_kind(channel_id=self.ch_id, content=self.cn, kind=self.request.GET['kind'])


def set_prerequisite_view(request, channel_id=None, content1=None, content2=None):
    api.set_prerequisite(channel_id=channel_id, content1=content1, content2=content2)
    return HttpResponse(status=200)

def set_is_related_view(request, channel_id=None, content1=None, content2=None):
    api.set_is_related(channel_id=channel_id, content1=content1, content2=content2)
    return HttpResponse(status=200)
