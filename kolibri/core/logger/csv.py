from __future__ import unicode_literals

import json
import math
import os
from io import open

from django.core.cache import cache
from django.http import Http404
from django.http import HttpResponse
from django.http.response import FileResponse
from rest_framework import serializers

from .models import ContentSessionLog
from .models import ContentSummaryLog
from kolibri.core.api import CSVModelViewSet
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.utils import conf


def cache_channel_name(channel_id):
        key = '{id}_ChannelMetadata_name'.format(id=channel_id)
        channel_name = cache.get(key)
        if channel_name is None:
            try:
                channel_name = ChannelMetadata.objects.get(id=channel_id)
            except ChannelMetadata.DoesNotExist:
                channel_name = ""
            cache.set(key, channel_name, 60 * 10)
        return channel_name


def cache_content_title(content_id):
        key = '{id}_ContentNode_title'.format(id=content_id)
        title = cache.get(key)
        if title is None:
            node = ContentNode.objects.filter(content_id=content_id).first()
            if node:
                title = node.title
            else:
                title = ""
            cache.set(key, title, 60 * 10)
        return title


def exported_logs_info(request):
    '''
    Get the last modification timestamp of the summary logs exported

    :returns: An object with the files informatin
    '''

    logs_dir = os.path.join(conf.KOLIBRI_HOME, 'log_export')
    csv_statuses = {}
    csv_export_filenames = {
        'session': 'content_session_logs.csv',
        'summary': 'content_summary_logs.csv'
    }
    for log_type in csv_export_filenames.keys():
        log_path = os.path.join(logs_dir, csv_export_filenames[log_type])
        if os.path.exists(log_path):
            csv_statuses[log_type] = os.path.getmtime(log_path)
        else:
            csv_statuses[log_type] = None

    return HttpResponse(json.dumps(csv_statuses), content_type='application/json')


def download_csv_file(request, log_type):
    csv_export_filenames = {
        'session': 'content_session_logs.csv',
        'summary': 'content_summary_logs.csv'
    }
    if log_type in csv_export_filenames.keys():
        filepath = os.path.join(conf.KOLIBRI_HOME, 'log_export', csv_export_filenames[log_type])
    else:
        filepath = None

    # if the file does not exist on disk, return a 404
    if filepath is None or not os.path.exists(filepath):
        raise Http404('There is no csv export file for {} available'.format(log_type))

    # generate a file response
    response = FileResponse(open(filepath, 'rb'))
    # set the content-type by guessing from the filename
    response['Content-Type'] = 'text/csv'

    # set the content-disposition as attachment to force download
    response['Content-Disposition'] = 'attachment; filename={}'.format(csv_export_filenames[log_type])

    # set the content-length to the file size
    response['Content-Length'] = os.path.getsize(filepath)

    return response


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
        return cache_channel_name(obj.channel_id)

    def get_content_title(self, obj):
        return cache_content_title(obj.content_id)

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
