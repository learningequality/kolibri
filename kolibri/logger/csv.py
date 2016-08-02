from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from rest_framework import serializers, viewsets
from rest_framework_csv.renderers import CSVRenderer

from .models import ContentSummaryLog


class CSVModelViewSet(viewsets.ModelViewSet):

    csv_export_filename = 'export'

    def __init__(self, *args, **kwargs):
        self.renderer_classes = self.generate_csv_renderer()

    def generate_csv_renderer(self):
        class_name = self.serializer_class.__name__.replace("Serializer", "Renderer")
        parents = (CSVRenderer,)
        header = self.serializer_class.Meta.fields
        renderer_class = type(class_name, parents, {"header": header})
        return (renderer_class,)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super(CSVModelViewSet, self).finalize_response(request, response, *args, **kwargs)
        response['content-disposition'] = 'attachment; filename=%s.csv' % self.csv_export_filename
        return response


class ContentSummaryLogCSVSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()

    class Meta:
        model = ContentSummaryLog
        fields = ('user', 'username', 'content_id', 'channel_id', 'start_timestamp',
                  'last_activity_timestamp', 'completion_timestamp', 'progress', 'kind', 'extra_fields')

    def get_username(self, obj):
        return obj.user.username


class ContentSummaryLogCSVExportViewSet(CSVModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogCSVSerializer
    csv_export_filename = 'content_summary_logs'
