from django.db.models import Case, Count, F, IntegerField, Sum, Value as V, When
from django.db.models.functions import Coalesce
from kolibri.auth.models import FacilityUser
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
            'pk', 'full_name', 'progress', 'last_active',
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


class ContentReportSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()
    last_active = serializers.SerializerMethodField()
    parent = serializers.SerializerMethodField()

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'progress', 'kind', 'last_active', 'parent',
        )

    def get_progress(self, target_node):
        kwargs = self.context['view'].kwargs
        if target_node.kind == content_kinds.TOPIC:
            kind_counts = target_node.get_descendant_kind_counts()
            # filter logs by each kind under target node, and sum progress over logs
            progress = ContentSummaryLog.objects \
                .filter_by_topic(target_node) \
                .filter(user__in=get_members_or_user(kwargs['collection_kind'], kwargs['collection_id'])) \
                .values('kind') \
                .annotate(total_progress=Sum('progress'))
            # add kind counts under this node to progress dict
            for kind in progress:
                kind['node_count'] = kind_counts[kind['kind']]
                del kind_counts[kind['kind']]
            # evaluate queryset so we can add data for kinds that do not have logs
            progress = list(progress)
            for key in kind_counts:
                progress.append({'kind': key, 'node_count': kind_counts[key], 'total_progress': 0})
            return progress
        else:
            # filter logs by a specific leaf node and compute stats over queryset
            leaf_node_stats = ContentSummaryLog.objects \
                .filter(content_id=target_node.content_id) \
                .filter(user__in=get_members_or_user(kwargs['collection_kind'], kwargs['collection_id'])) \
                .aggregate(total_progress=Coalesce(Sum('progress'), V(0)),
                           log_count_total=Coalesce(Count('pk'), V(0)),
                           log_count_complete=Coalesce(Sum(Case(When(progress=1, then=1), default=0, output_field=IntegerField())), V(0)))
            return [leaf_node_stats]  # return as array for consistency in api

    def get_last_active(self, target_node):
        kwargs = self.context['view'].kwargs
        try:
            if target_node.kind == content_kinds.TOPIC:
                return ContentSummaryLog.objects \
                    .filter_by_topic(target_node) \
                    .filter(user__in=get_members_or_user(kwargs['collection_kind'], kwargs['collection_id'])) \
                    .latest('end_timestamp').end_timestamp
            else:
                return ContentSummaryLog.objects \
                    .filter(content_id=target_node.content_id) \
                    .filter(user__in=get_members_or_user(kwargs['collection_kind'], kwargs['collection_id'])) \
                    .latest('end_timestamp').end_timestamp
        except ContentSummaryLog.DoesNotExist:
            return None

    def get_parent(self, target_node):
        # returns immediate parent
        return target_node.get_ancestors().values('pk', 'title').last()


class ContentSummarySerializer(ContentReportSerializer):
    ancestors = serializers.SerializerMethodField()
    num_users = serializers.SerializerMethodField()

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'progress', 'kind', 'last_active', 'ancestors', 'num_users',
        )

    def get_ancestors(self, target_node):
        """
        in descending order (root ancestor first, immediate parent last)
        """
        return target_node.get_ancestors().values('pk', 'title')

    def get_num_users(self, target_node):
        kwargs = self.context['view'].kwargs
        return get_members_or_user(kwargs['collection_kind'], kwargs['collection_id']).count()
