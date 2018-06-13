import os

from django.core.cache import cache
from django.db.models import Manager
from django.db.models import Sum
from django.db.models.query import RawQuerySet
from le_utils.constants import content_kinds
from rest_framework import serializers

from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.core.content.utils.content_types_tools import renderable_contentnodes_q_filter
from kolibri.core.content.utils.import_export_content import get_num_coach_contents
from kolibri.core.content.utils.paths import get_content_storage_file_path


class ChannelMetadataSerializer(serializers.ModelSerializer):
    root = serializers.PrimaryKeyRelatedField(read_only=True)
    lang_code = serializers.SerializerMethodField()
    lang_name = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()

    def to_representation(self, instance):
        value = super(ChannelMetadataSerializer, self).to_representation(instance)

        value.update({"num_coach_contents": get_num_coach_contents(instance.root)})

        # if it has the file_size flag add extra file_size information
        if 'request' in self.context and self.context['request'].GET.get('file_sizes', False):
            # only count up currently renderable content types, as only these will be downloaded
            descendants = ContentNode.objects.filter(channel_id=instance.id).filter(renderable_contentnodes_q_filter).distinct()
            total_resources = descendants.exclude(kind=content_kinds.TOPIC).count()

            # only count up currently renderable content types, as only these will be downloaded
            local_files = LocalFile.objects.filter(files__contentnode__in=descendants).distinct()
            total_file_size = local_files.aggregate(Sum('file_size'))['file_size__sum'] or 0

            on_device_resources = descendants.exclude(kind=content_kinds.TOPIC).filter(available=True).count()
            on_device_file_size = local_files.filter(available=True).aggregate(Sum('file_size'))['file_size__sum'] or 0

            value.update({
                "total_resources": total_resources,
                "total_file_size": total_file_size,
                "on_device_resources": on_device_resources,
                "on_device_file_size": on_device_file_size,
            })

        return value

    def get_lang_code(self, instance):
        if instance.root.lang is None:
            return None

        return instance.root.lang.lang_code

    def get_lang_name(self, instance):
        if instance.root.lang is None:
            return None

        return instance.root.lang.lang_name

    def get_available(self, instance):
        return instance.root.available

    class Meta:
        model = ChannelMetadata
        fields = (
            'author',
            'description',
            'id',
            'last_updated',
            'lang_code',
            'lang_name',
            'name',
            'root',
            'thumbnail',
            'version',
            'available',
        )


class LowerCaseField(serializers.CharField):

    def to_representation(self, obj):
        return super(LowerCaseField, self).to_representation(obj).lower()


class LanguageSerializer(serializers.ModelSerializer):
    id = LowerCaseField(max_length=14)
    lang_code = LowerCaseField(max_length=3)
    lang_subcode = LowerCaseField(max_length=10)

    class Meta:
        model = Language
        fields = ('id', 'lang_code', 'lang_subcode', 'lang_name', 'lang_direction')


class FileSerializer(serializers.ModelSerializer):
    storage_url = serializers.SerializerMethodField()
    preset = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    lang = LanguageSerializer()

    def get_storage_url(self, target_node):
        return target_node.get_storage_url()

    def get_preset(self, target_node):
        return target_node.get_preset()

    def get_download_url(self, target_node):
        return target_node.get_download_url()

    def get_extension(self, target_node):
        return target_node.get_extension()

    def get_file_size(self, target_node):
        return target_node.get_file_size()

    class Meta:
        model = File
        fields = ('storage_url', 'id', 'priority', 'available', 'file_size', 'extension', 'preset', 'lang',
                  'supplementary', 'thumbnail', 'download_url')


class AssessmentMetaDataSerializer(serializers.ModelSerializer):

    assessment_item_ids = serializers.JSONField(default='[]')
    mastery_model = serializers.JSONField(default='{}')

    class Meta:
        model = AssessmentMetaData
        fields = ('assessment_item_ids', 'number_of_assessments', 'mastery_model', 'randomize', 'is_manipulable', )


def get_summary_logs(content_ids, user):
    from kolibri.logger.models import ContentSummaryLog
    if not content_ids:
        return ContentSummaryLog.objects.none()
    # get all summary logs for the current user that correspond to the descendant content nodes
    return ContentSummaryLog.objects.filter(user=user, content_id__in=content_ids)


def get_topic_progress_fraction(topic, user):
    leaf_ids = topic.get_descendants(include_self=False).order_by().exclude(
        kind=content_kinds.TOPIC).values_list("content_id", flat=True)
    return round(
        (get_summary_logs(leaf_ids, user).aggregate(Sum('progress'))['progress__sum'] or 0) / (len(leaf_ids) or 1),
        4
    )


def get_content_progress_fraction(content, user):
    from kolibri.logger.models import ContentSummaryLog
    try:
        # add up all the progress for the logs, and divide by the total number of content nodes to get overall progress
        overall_progress = ContentSummaryLog.objects.get(user=user, content_id=content.content_id).progress
    except ContentSummaryLog.DoesNotExist:
        return None
    return round(overall_progress, 4)


def get_topic_and_content_progress_fraction(node, user):
    if node.kind == content_kinds.TOPIC:
        return get_topic_progress_fraction(node, user)
    else:
        return get_content_progress_fraction(node, user)


def get_topic_and_content_progress_fractions(nodes, user):
    leaf_ids = nodes.get_descendants(include_self=True).order_by().exclude(
        kind=content_kinds.TOPIC).values_list("content_id", flat=True)

    summary_logs = get_summary_logs(leaf_ids, user)

    overall_progress = {log['content_id']: round(log['progress'], 4) for log in summary_logs.values('content_id', 'progress')}

    for node in nodes:
        if node.kind == content_kinds.TOPIC:
            leaf_ids = node.get_descendants(include_self=True).order_by().exclude(
                kind=content_kinds.TOPIC).values_list("content_id", flat=True)
            overall_progress[node.content_id] = round(
                sum(overall_progress.get(leaf_id, 0) for leaf_id in leaf_ids) / len(leaf_ids),
                4
            ) if leaf_ids else 0.0

    return overall_progress


def get_content_progress_fractions(nodes, user):
    if isinstance(nodes, RawQuerySet) or isinstance(nodes, list):
        leaf_ids = [datum.content_id for datum in nodes]
    else:
        leaf_ids = nodes.exclude(kind=content_kinds.TOPIC).values_list("content_id", flat=True)

    summary_logs = get_summary_logs(leaf_ids, user)

    # make a lookup dict for all logs to allow mapping from content_id to current progress
    overall_progress = {log['content_id']: round(log['progress'], 4) for log in summary_logs.values('content_id', 'progress')}
    return overall_progress


class ContentNodeListSerializer(serializers.ListSerializer):

    def to_representation(self, data):

        # Dealing with nested relationships, data can be a Manager,
        # so, first get a queryset from the Manager if needed
        data = data.all() if isinstance(data, Manager) else data

        # initialize cache key
        cache_key = None

        # ensure that we are filtering by the parent only
        # this allows us to only cache results on the learn page
        from .api import ContentNodeFilter
        parent_filter_only = set(self.context['request'].GET.keys()).intersection(ContentNodeFilter.Meta.fields) == set(['parent'])

        # Cache parent look ups only
        if parent_filter_only:
            cache_key = 'contentnode_list_{parent}'.format(
                parent=self.context['request'].GET.get('parent'))

            if cache.get(cache_key):
                return cache.get(cache_key)

        if not data:
            return data

        if 'request' not in self.context or not self.context['request'].user.is_facility_user:
            progress_dict = {}
        else:
            user = self.context["request"].user
            # Don't annotate topic progress as too expensive
            progress_dict = get_content_progress_fractions(data, user)

        result = []
        topic_only = True

        # Allow results to be limited after all queryset filtering has occurred
        if self.limit:
            data = data[:self.limit]

        for item in data:
            obj = self.child.to_representation(
                item,
                progress_fraction=progress_dict.get(item.content_id),
                annotate_progress_fraction=False
            )
            topic_only = topic_only and obj.get('kind') == content_kinds.TOPIC
            result.append(obj)

        # Only store if all nodes are topics, because we don't annotate progress on them
        # This has the happy side effect of not caching our dynamically calculated
        # recommendation queries, which might change for the same user over time
        # because they do not return topics
        if topic_only and parent_filter_only:
            cache.set(cache_key, result, 60 * 10)

        return result


class ContentNodeSerializer(serializers.ModelSerializer):
    num_coach_contents = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    files = FileSerializer(many=True, read_only=True)
    assessmentmetadata = AssessmentMetaDataSerializer(read_only=True, allow_null=True, many=True)
    lang = LanguageSerializer()

    class Meta:
        model = ContentNode
        fields = (
            'id',
            'assessmentmetadata',
            'author',
            'available',
            'channel_id',
            'coach_content',
            'content_id',
            'description',
            'files',
            'kind',
            'lang',
            'license_description',
            'license_name',
            'license_owner',
            'num_coach_contents',
            'parent',
            'pk',  # TODO remove after UI standardizes on 'id'
            'sort_order',
            'title',
        )
        list_serializer_class = ContentNodeListSerializer

    def __new__(cls, *args, **kwargs):
        # This is overwritten to provide a ListClassSerializer for many=True
        limit = kwargs.pop('limit', None)
        new = super(ContentNodeSerializer, cls).__new__(cls, *args, **kwargs)
        new.limit = limit
        return new

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

    def to_representation(self, instance, progress_fraction=None, annotate_progress_fraction=True):
        if progress_fraction is None and annotate_progress_fraction:
            if 'request' not in self.context or not self.context['request'].user.is_facility_user:
                # Don't try to annotate for a non facility user
                progress_fraction = 0.0
            else:
                user = self.context["request"].user
                if instance.kind != content_kinds.TOPIC:
                    progress_fraction = get_content_progress_fraction(instance, user)
        value = super(ContentNodeSerializer, self).to_representation(instance)
        value['progress_fraction'] = progress_fraction
        return value

    def get_num_coach_contents(self, instance):
        user = self.context["request"].user
        if user.is_facility_user:  # exclude anon users
            if user.roles.exists() or user.is_superuser:  # must have coach role or higher
                return get_num_coach_contents(instance)
        # all other conditions return 0
        return 0


class ContentNodeGranularSerializer(serializers.ModelSerializer):
    num_coach_contents = serializers.SerializerMethodField()
    total_resources = serializers.SerializerMethodField()
    on_device_resources = serializers.SerializerMethodField()
    importable = serializers.SerializerMethodField()

    class Meta:
        model = ContentNode
        fields = (
            'id',
            'available',
            'coach_content',
            'importable',
            'kind',
            'num_coach_contents',
            'on_device_resources',
            'pk',  # TODO remove once UI uses 'id' exclusively
            'title',
            'total_resources',
        )

    def get_total_resources(self, instance):
        return instance.get_descendants(include_self=True) \
            .exclude(kind=content_kinds.TOPIC) \
            .filter(renderable_contentnodes_q_filter) \
            .distinct() \
            .count()

    def get_on_device_resources(self, instance):
        return instance.get_descendants(include_self=True) \
            .exclude(kind=content_kinds.TOPIC) \
            .filter(renderable_contentnodes_q_filter) \
            .filter(available=True) \
            .distinct() \
            .count()

    def get_num_coach_contents(self, instance):
        # If for exporting, only show what is available on server. For importing,
        # show all of the coach contents in the topic.
        for_export = self.context['request'].query_params.get('for_export', None)
        return get_num_coach_contents(instance, filter_available=for_export)

    def get_importable(self, instance):
        drive_id = self.context['request'].query_params.get('importing_from_drive_id', None)

        # If node is from a remote source, assume it is importable.
        # Topics are annotated as importable by default, but client may disable importing
        # of the topic if it determines that the entire topic sub-tree is already on the device.
        if drive_id is None or instance.kind == content_kinds.TOPIC:
            return True

        # If non-topic ContentNode has no files, then it is not importable.
        content_files = instance.files.all()
        if not content_files.exists():
            return False

        # Inspecting the external drive's files
        datafolder = cache.get(drive_id, None)

        if datafolder is None:
            drive_ids = get_mounted_drives_with_channel_info()
            if drive_id in drive_ids:
                datafolder = drive_ids[drive_id].datafolder
                cache.set(drive_id, datafolder, 60)  # cache the datafolder for 1 minute
            else:
                raise serializers.ValidationError('The external drive with given drive id {} does not exist.'.format(drive_id))

        importable = True
        for f in content_files:
            # Node is importable only if all of its Files are on the external drive
            file_path = get_content_storage_file_path(f.local_file.get_filename(), datafolder)
            importable = importable and os.path.exists(file_path)
            if not importable:
                break
        return importable


class ContentNodeProgressListSerializer(serializers.ListSerializer):

    def to_representation(self, data):

        if not data:
            return data

        if 'request' not in self.context or not self.context['request'].user.is_facility_user:
            progress_dict = {}
        else:
            user = self.context["request"].user
            # Don't annotate topic progress as too expensive
            progress_dict = get_topic_and_content_progress_fractions(data, user)

        # Dealing with nested relationships, data can be a Manager,
        # so, first get a queryset from the Manager if needed
        iterable = data.all() if isinstance(data, Manager) else data

        return [
            self.child.to_representation(
                item,
                progress_fraction=progress_dict.get(item.content_id, 0.0),
                annotate_progress_fraction=False
            ) for item in iterable
        ]


class ContentNodeProgressSerializer(serializers.Serializer):

    def to_representation(self, instance, progress_fraction=None, annotate_progress_fraction=True):
        if progress_fraction is None and annotate_progress_fraction:
            if 'request' not in self.context or not self.context['request'].user.is_facility_user:
                # Don't try to annotate for a non facility user
                progress_fraction = 0
            else:
                user = self.context["request"].user
                progress_fraction = get_topic_and_content_progress_fraction(instance, user) or 0.0
        return {
            'pk': instance.pk,
            'progress_fraction': progress_fraction,
        }

    class Meta:
        list_serializer_class = ContentNodeProgressListSerializer
