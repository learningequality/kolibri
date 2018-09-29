from __future__ import unicode_literals

import math

from rest_framework import serializers

from .models import ContentSessionLog
from .models import ContentSummaryLog
from kolibri.core.api import CSVModelViewSet
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode


class LogCSVSerializerBase(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()
    facility_name = serializers.SerializerMethodField()
    channel_name = serializers.SerializerMethodField()
    content_title = serializers.SerializerMethodField()
    time_spent = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        else:
            return ""

    def get_facility_name(self, obj):
        if obj.user:
            return obj.user.facility.name
        else:
            return ""

    def get_channel_name(self, obj):
        try:
            channel = ChannelMetadata.objects.get(id=obj.channel_id)
        except ChannelMetadata.DoesNotExist:
            return ""
        return channel.name

    def get_content_title(self, obj):
        node = ContentNode.objects.filter(content_id=obj.content_id).first()
        if node:
            return node.title
        else:
            return ""

    def get_time_spent(self, obj):
        return "{:.1f}".format(round(obj.time_spent, 1))

    def get_progress(self, obj):

        return "{:.4f}".format(
            math.floor(obj.progress * 10000.0) / 10000
        )


class ContentSummaryLogCSVSerializer(LogCSVSerializerBase):

    class Meta:
        model = ContentSummaryLog
        fields = ('username', 'facility_name', 'content_id', 'content_title', 'channel_id', 'channel_name', 'start_timestamp',
                  'end_timestamp', 'completion_timestamp', 'time_spent', 'progress', 'kind')
        labels = {
            "start_timestamp": "Time of first interaction",
            "end_timestamp": "Time of last interaction",
            "completion_timestamp": "Time of completion",
            "time_spent": "Time Spent (sec)",
            "progress": "Progress (0-1)",
        }


class ContentSessionLogCSVSerializer(LogCSVSerializerBase):

    class Meta:
        model = ContentSessionLog
        fields = ('username', 'facility_name', 'content_id', 'content_title', 'channel_id', 'channel_name', 'start_timestamp',
                  'end_timestamp', 'time_spent', 'progress', 'kind')
        labels = {
            "start_timestamp": "Time of first interaction",
            "end_timestamp": "Time of last interaction",
            "time_spent": "Time Spent (sec)",
            "progress": "Progress (0-1)",
        }


class ContentSummaryLogCSVExportViewSet(CSVModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogCSVSerializer
    csv_export_filename = 'content_summary_logs'


class ContentSessionLogCSVExportViewSet(CSVModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentSessionLog.objects.all()
    serializer_class = ContentSessionLogCSVSerializer
    csv_export_filename = 'content_session_logs'
