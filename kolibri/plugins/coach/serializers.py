from functools import reduce

from dateutil.parser import parse
from django.db.models import Case, Count, F, IntegerField, Manager, Max, Sum, Value as V, When
from django.db.models.functions import Coalesce
from kolibri.auth.models import FacilityUser
from kolibri.content.content_db_router import default_database_is_attached, get_active_content_database
from kolibri.content.models import ContentNode
from kolibri.logger.models import ContentSummaryLog
from le_utils.constants import content_kinds
from rest_framework import serializers

from .utils.return_users import get_members_or_user


class UserReportSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()
    last_active = serializers.SerializerMethodField()

    class Meta:
        model = FacilityUser
        fields = (
            'pk', 'username', 'full_name', 'progress', 'last_active',
        )

    def get_progress(self, target_user):
        content_node = ContentNode.objects.get(pk=self.context['view'].kwargs['content_node_id'])
        # progress details for a topic node and everything under it
        if content_node.kind == content_kinds.TOPIC:
            kind_counts = content_node.get_descendant_kind_counts()
            topic_details = ContentSummaryLog.objects \
                .filter_by_topic(content_node) \
                .filter(user=target_user) \
                .values('kind') \
                .annotate(total_progress=Sum('progress')) \
                .annotate(log_count_total=Count('pk')) \
                .annotate(log_count_complete=Sum(Case(When(progress=1, then=1), default=0, output_field=IntegerField())))
            # evaluate queryset so we can add data for kinds that do not have logs
            topic_details = list(topic_details)
            for kind in topic_details:
                del kind_counts[kind['kind']]
            for key in kind_counts:
                topic_details.append({'kind': key, 'total_progress': 0, 'log_count_total': 0, 'log_count_complete': 0})
            return topic_details
        else:
            # progress details for a leaf node (exercise, video, etc.)
            leaf_details = ContentSummaryLog.objects \
                .filter(user=target_user) \
                .filter(content_id=content_node.content_id) \
                .annotate(total_progress=F('progress')) \
                .values('kind', 'time_spent', 'total_progress')
            return leaf_details if leaf_details else [{'kind': content_node.kind, 'time_spent': 0, 'total_progress': 0}]

    def get_last_active(self, target_user):
        content_node = ContentNode.objects.get(pk=self.context['view'].kwargs['content_node_id'])
        try:
            if content_node.kind == content_kinds.TOPIC:
                return ContentSummaryLog.objects \
                    .filter_by_topic(content_node) \
                    .filter(user=target_user) \
                    .latest('end_timestamp').end_timestamp
            else:
                return ContentSummaryLog.objects \
                    .filter(user=target_user) \
                    .get(content_id=content_node.content_id).end_timestamp
        except ContentSummaryLog.DoesNotExist:
            return None


progress_keys = [
    'total_progress',
    'log_count_total',
    'log_count_complete'
]


def sum_progress_dicts(dict_a, dict_b):
    return {
        'total_progress': dict_a.get('total_progress', 0) + dict_b.get('total_progress', 0),
    }


def get_progress_and_last_active(target_nodes, **kwargs):
    output_progress_dict = {}
    output_last_active_dict = {}
    users = list(get_members_or_user(kwargs['collection_kind'], kwargs['collection_id']))
    content_ids = target_nodes.get_descendants(include_self=True).order_by().values_list("content_id", flat=True)
    # get all summary logs for the current user that correspond to the descendant content nodes
    if default_database_is_attached():  # if possible, do a direct join between the content and default databases
        channel_alias = get_active_content_database()
        SummaryLogManager = ContentSummaryLog.objects.using(channel_alias)
    else:  # otherwise, convert the leaf queryset into a flat list of ids and use that
        SummaryLogManager = ContentSummaryLog.objects
        content_ids = list(content_ids)
    progress_query = SummaryLogManager \
        .filter(user__in=users, content_id__in=content_ids)
    if kwargs.get('last_active_time'):
        progress_query.filter(end_timestamp__gte=parse(kwargs.get('last_active_time')))
    progress_list = progress_query.values('content_id', 'kind').annotate(
        total_progress=Coalesce(Sum('progress'), V(0)),
        log_count_total=Coalesce(Count('pk'), V(0)),
        log_count_complete=Coalesce(Sum(Case(When(progress=1, then=1), default=0, output_field=IntegerField())), V(0)),
        last_active=Max('end_timestamp'))
    progress_dict = {item.get('content_id'): item for item in progress_list}
    if isinstance(target_nodes, ContentNode):
        # Have been passed an individual model
        target_nodes = [target_nodes]
    for target_node in target_nodes:
        if target_node.kind == content_kinds.TOPIC:
            leaf_nodes = target_node.get_descendants(include_self=False).order_by().values('content_id', 'kind')
            leaf_ids = set([leaf_node.get('content_id') for leaf_node in leaf_nodes if leaf_node.get('kind') != content_kinds.TOPIC])
            leaf_kinds = sorted(set([leaf_node.get('kind') for leaf_node in leaf_nodes if leaf_node.get('kind') != content_kinds.TOPIC]))
            progress = [{
                'total_progress': reduce(
                    sum_progress_dicts,
                    [progress_dict.get(leaf_id, {}) for leaf_id in leaf_ids if progress_dict.get(leaf_id, {}).get('kind') == kind],
                    sum_progress_dicts({}, {})
                ).get('total_progress'),
                'kind': kind,
                'node_count': reduce(lambda x, y: x + int(y.get('kind') == kind), leaf_nodes, 0)
            } for kind in leaf_kinds]
            output_progress_dict[target_node.content_id] = progress
            last_active_times = [progress_dict.get(leaf_id, {}).get('last_active') for leaf_id in leaf_ids if progress_dict.get(leaf_id, {}).get('last_active')]
            output_last_active_dict[target_node.content_id] = max(last_active_times) if last_active_times else None
        else:
            # return as array for consistency in api
            output_progress_dict[target_node.content_id] = [{key: progress_dict.get(target_node.content_id, {}).get(key, 0) for key in progress_keys}]
            output_last_active_dict[target_node.content_id] = progress_dict.get(target_node.content_id, {}).get('last_active')
    return output_progress_dict, output_last_active_dict


class ContentReportListSerializer(serializers.ListSerializer):

    def to_representation(self, data):

        if not data:
            return data

        if 'request' not in self.context:
            progress_dict = {}
        else:
            kwargs = self.context['view'].kwargs
            progress_dict, last_active_dict = get_progress_and_last_active(data, **kwargs)

        # Dealing with nested relationships, data can be a Manager,
        # so, first get a queryset from the Manager if needed
        iterable = data.all() if isinstance(data, Manager) else data

        return [
            self.child.to_representation(
                item,
                progress=progress_dict.get(item.content_id),
                last_active=last_active_dict.get(item.content_id)) for item in iterable
        ]


class ContentReportSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'kind',
        )
        list_serializer_class = ContentReportListSerializer

    def to_representation(self, instance, progress=None, last_active=None):
        if progress is None:
            if 'request' not in self.context:
                progress = [{'total_progress': 0, 'log_count_total': 0, 'log_count_complete': 0}]
            else:
                kwargs = self.context['view'].kwargs
                progress_dict, last_active_dict = get_progress_and_last_active(instance, **kwargs)
                progress = progress_dict.get(instance.content_id)
                last_active = last_active_dict.get(instance.content_id)
        value = super(ContentReportSerializer, self).to_representation(instance)
        value['progress'] = progress
        value['last_active'] = last_active
        return value


class ContentSummarySerializer(ContentReportSerializer):
    ancestors = serializers.SerializerMethodField()
    num_users = serializers.SerializerMethodField()

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'kind', 'ancestors', 'num_users',
        )
        list_serializer_class = ContentReportListSerializer

    def get_ancestors(self, target_node):
        """
        in descending order (root ancestor first, immediate parent last)
        """
        return target_node.get_ancestors().values('pk', 'title')

    def get_num_users(self, target_node):
        kwargs = self.context['view'].kwargs
        return get_members_or_user(kwargs['collection_kind'], kwargs['collection_id']).count()
