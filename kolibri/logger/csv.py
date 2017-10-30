from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.content.models import ChannelMetadata, ContentNode
from kolibri.core.api import CSVModelViewSet
from rest_framework import serializers

from .models import ContentSessionLog, ContentSummaryLog


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
        channel = ChannelMetadata.objects.get(id=obj.channel_id)
        node = ContentNode.objects.filter(tree_id=channel.root.tree_id).first()
        if node:
            return node.title
        else:
            return ""

    def get_time_spent(self, obj):
        return str("{:.1f}".format(round(obj.time_spent, 1)))

    def get_progress(self, obj):
        return str("{:.4f}".format(round(obj.progress, 4)))


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
