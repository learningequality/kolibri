from django.db.models import Sum
from kolibri.auth.models import FacilityUser
from kolibri.content.models import ChannelMetadataCache, ContentNode, File
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


class ContentNodeSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    files = FileSerializer(many=True, read_only=True)
    ancestors = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    progress_fraction = serializers.SerializerMethodField()

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

    def get_progress_fraction(self, target_node):

        from kolibri.logger.models import ContentSummaryLog

        # no progress if we don't have a request object or the user isn't a FacilityUser
        if 'request' not in self.context or not isinstance(self.context['request'].user, FacilityUser):
            return 0

        # we're getting  progress for the currently logged-in user
        user = self.context["request"].user

        # get the content_id for every content node that's under this node
        leaf_ids = target_node.get_descendants(include_self=True).exclude(kind="topic").values_list("content_id", flat=True)

        # get all summary logs for the current user that correspond to the descendant content nodes
        if default_database_is_attached():  # if possible, do a direct join between the content and default databases
            channel_alias = get_active_content_database()
            summary_logs = ContentSummaryLog.objects.using(channel_alias).filter(user=user, content_id__in=leaf_ids)
        else:  # otherwise, convert the leaf queryset into a flat list of ids and use that
            summary_logs = ContentSummaryLog.objects.filter(user=user, content_id__in=list(leaf_ids))

        # add up all the progress for the logs, and divide by the total number of content nodes to get overall progress
        overall_progress = (summary_logs.aggregate(Sum("progress"))["progress__sum"] or 0) / (leaf_ids.count() or 1)
        return round(overall_progress, 4)

    def get_ancestors(self, target_node):
        """
        in descending order (root ancestor first, immediate parent last)
        """
        return target_node.get_ancestors().values('pk', 'title')

    def get_thumbnail(self, target_node):
        thumbnail_model = target_node.files.filter(thumbnail=True, available=True).first()
        return thumbnail_model.get_storage_url() if thumbnail_model else None

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'files', 'ancestors', 'parent', 'thumbnail', 'progress_fraction'
        )
