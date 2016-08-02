from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.content.content_db_router import using_content_database
from kolibri.content.models import ChannelMetadataCache, ContentNode
from kolibri.core.api import CSVModelViewSet
from rest_framework import serializers

from .models import ContentSummaryLog


class ContentSummaryLogCSVSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()
    facility_name = serializers.SerializerMethodField()
    channel_name = serializers.SerializerMethodField()
    content_title = serializers.SerializerMethodField()

    class Meta:
        model = ContentSummaryLog
        fields = ('username', 'facility_name', 'content_id', 'content_title', 'channel_id', 'channel_name', 'start_timestamp',
                  'last_activity_timestamp', 'completion_timestamp', 'progress', 'kind')
        labels = {
            "start_timestamp": "Time of first interaction",
            "last_activity_timestamp": "Time of last interaction",
            "completion_timestamp": "Time of completion",
        }

    def get_username(self, obj):
        return obj.user.username

    def get_facility_name(self, obj):
        return obj.user.facility.name

    def get_channel_name(self, obj):
        try:
            channel = ChannelMetadataCache.objects.get(id=obj.channel_id)
        except ChannelMetadataCache.DoesNotExist:
            return ""
        return channel.name

    def get_content_title(self, obj):
        try:
            with using_content_database(obj.channel_id):
                node = ContentNode.objects.filter(content_id=obj.content_id).first()
                if node:
                    return node.title
                else:
                    return ""
        except KeyError:  # content DB doesn't exist
            return ""


class ContentSummaryLogCSVExportViewSet(CSVModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogCSVSerializer
    csv_export_filename = 'content_summary_logs'
