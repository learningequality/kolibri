# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from rest_framework import viewsets

from . import models, serializers


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
