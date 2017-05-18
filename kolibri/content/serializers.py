from django.db.models import Manager
from django.db.models.query import RawQuerySet
from kolibri.content.models import AssessmentMetaData, ChannelMetadataCache, ContentNode, File
from rest_framework import serializers

from .content_db_router import default_database_is_attached, get_active_content_database


class ChannelMetadataCacheSerializer(serializers.ModelSerializer):

    class Meta:
        model = ChannelMetadataCache
        fields = ('root_pk', 'id', 'name', 'description', 'author')


class FileSerializer(serializers.ModelSerializer):
    storage_url = serializers.SerializerMethodField()
    preset = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    def get_storage_url(self, target_node):
        return target_node.get_storage_url()

    def get_preset(self, target_node):
        return target_node.get_preset()

    def get_download_url(self, target_node):
        return target_node.get_download_url()

    class Meta:
        model = File
        fields = ('storage_url', 'id', 'priority', 'checksum', 'available', 'file_size', 'extension', 'preset', 'lang',
                  'supplementary', 'thumbnail', 'download_url')


class AssessmentMetaDataSerializer(serializers.ModelSerializer):

    assessment_item_ids = serializers.JSONField(default='[]')
    mastery_model = serializers.JSONField(default='{}')

    class Meta:
        model = AssessmentMetaData
        fields = ('assessment_item_ids', 'number_of_assessments', 'mastery_model', 'randomize', 'is_manipulable', )


def get_progress_fraction(content_id, user):
    from kolibri.logger.models import ContentSummaryLog
    try:
        # add up all the progress for the logs, and divide by the total number of content nodes to get overall progress
        overall_progress = ContentSummaryLog.objects.get(user=user, content_id=content_id).progress
    except ContentSummaryLog.DoesNotExist:
        return None
    return round(overall_progress, 4)


def get_progress_fractions(nodes, user):
    from kolibri.logger.models import ContentSummaryLog
    if isinstance(nodes, RawQuerySet) or isinstance(nodes, list):
        leaf_ids = [datum.content_id for datum in nodes]
    else:
        leaf_ids = nodes.values_list("content_id", flat=True)

    # get all summary logs for the current user that correspond to the descendant content nodes
    if default_database_is_attached():  # if possible, do a direct join between the content and default databases
        channel_alias = get_active_content_database()
        summary_logs = ContentSummaryLog.objects.using(channel_alias).filter(user=user, content_id__in=leaf_ids)
    else:  # otherwise, convert the leaf queryset into a flat list of ids and use that
        summary_logs = ContentSummaryLog.objects.filter(user=user, content_id__in=list(leaf_ids))

    # make a lookup dict for all logs to allow mapping from content_id to current progress
    overall_progress = {log['content_id']: round(log['progress'], 4) for log in summary_logs.values('content_id', 'progress')}
    return overall_progress


class ContentNodeListSerializer(serializers.ListSerializer):

    def to_representation(self, data):

        if not data:
            return data

        if 'request' not in self.context or not self.context['request'].user.is_facility_user:
            progress_dict = {}
        else:
            user = self.context["request"].user
            progress_dict = get_progress_fractions(data, user)

        # Dealing with nested relationships, data can be a Manager,
        # so, first get a queryset from the Manager if needed
        iterable = data.all() if isinstance(data, Manager) else data

        return [
            self.child.to_representation(item, progress_dict.get(item.content_id)) for item in iterable
        ]


class ContentNodeSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    files = FileSerializer(many=True, read_only=True)
    assessmentmetadata = AssessmentMetaDataSerializer(read_only=True, allow_null=True, many=True)
    license = serializers.StringRelatedField(many=False)
    license_description = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        # Instantiate the superclass normally
        super(ContentNodeSerializer, self).__init__(*args, **kwargs)

        # enable dynamic fields specification!
        if 'request' in self.context and self.context['request'].GET.get('fields', None):
            fields = self.context['request'].GET['fields'].split(',')
            # Drop any fields that are not specified in the `fields` argument.
            allowed = set(fields)
            existing = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)

    def to_representation(self, instance, progress_fraction=None):
        if progress_fraction is None:
            if 'request' not in self.context or not self.context['request'].user.is_facility_user:
                progress_fraction = 0
            else:
                user = self.context["request"].user
                progress_fraction = get_progress_fraction(instance.content_id, user)
        value = super(ContentNodeSerializer, self).to_representation(instance)
        value['progress_fraction'] = progress_fraction
        return value

    def get_license_description(self, target_node):
        if target_node.license_id:
            return target_node.license.license_description
        return ''

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'description', 'kind', 'available', 'sort_order', 'license_owner',
            'license', 'license_description', 'files', 'parent', 'author',
            'assessmentmetadata',
        )

        list_serializer_class = ContentNodeListSerializer
