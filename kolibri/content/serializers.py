from django.core.cache import cache
from django.db.models import Manager, Sum
from django.db.models.query import RawQuerySet
from kolibri.content.models import AssessmentMetaData, ChannelMetadata, ContentNode, File, Language, LocalFile
from le_utils.constants import content_kinds
from rest_framework import serializers


class ChannelMetadataSerializer(serializers.ModelSerializer):
    root = serializers.PrimaryKeyRelatedField(read_only=True)

    def to_representation(self, instance):
        value = super(ChannelMetadataSerializer, self).to_representation(instance)

        # if it has the file_size flag add extra file_size information
        if 'request' in self.context and self.context['request'].GET.get('file_sizes', False):
            descendants = instance.root.get_descendants()
            total_resources = descendants.exclude(kind=content_kinds.TOPIC).count()

            local_files = LocalFile.objects.filter(files__contentnode__channel_id=instance.id).distinct()
            total_file_size = local_files.aggregate(Sum('file_size'))['file_size__sum'] or 0

            value.update({"total_resources": total_resources, "total_file_size": total_file_size})
        return value

    class Meta:
        model = ChannelMetadata
        fields = ('root', 'id', 'name', 'description', 'author', 'last_updated', 'version', 'thumbnail')


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
        pure_parent_query = "parent" in self.context['request'].GET and \
            not any(field in self.context['request'].GET for field in ContentNodeFilter.Meta.fields if field != "parent")

        # Cache parent look ups only
        if pure_parent_query:
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
        if topic_only and pure_parent_query:
            cache.set(cache_key, result, 60 * 10)

        return result


class ContentNodeSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    files = FileSerializer(many=True, read_only=True)
    assessmentmetadata = AssessmentMetaDataSerializer(read_only=True, allow_null=True, many=True)
    lang = LanguageSerializer()

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

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'description', 'kind', 'available', 'sort_order', 'license_owner',
            'license_name', 'license_description', 'files', 'parent', 'author',
            'assessmentmetadata', 'lang', 'channel_id',
        )

        list_serializer_class = ContentNodeListSerializer


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
