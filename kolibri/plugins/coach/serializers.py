from functools import reduce
from dateutil.parser import parse
from django.db.models import Case, Count, F, IntegerField, Manager, Max, Sum, When
from kolibri.auth.models import FacilityUser
from kolibri.content.models import ContentNode
from kolibri.logger.models import ContentSummaryLog
from kolibri.core.lessons.models import Lesson
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
            kinds = content_node.get_descendants().values_list('kind', flat=True).distinct()
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
                kinds.remove(kind['kind'])
            for kind in kinds:
                topic_details.append({'kind': kind, 'total_progress': 0.0, 'log_count_total': 0, 'log_count_complete': 0})
            return topic_details
        else:
            # progress details for a leaf node (exercise, video, etc.)
            leaf_details = ContentSummaryLog.objects \
                .filter(user=target_user) \
                .filter(content_id=content_node.content_id) \
                .annotate(total_progress=F('progress')) \
                .values('kind', 'time_spent', 'total_progress')
            return leaf_details if leaf_details else [{'kind': content_node.kind, 'time_spent': 0, 'total_progress': 0.0}]

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


def sum_progress_dicts(total_progress, progress_dict):
    return total_progress + progress_dict.get('total_progress', 0.0)

def get_progress_and_last_active(target_nodes, **kwargs):
    # Prepare dictionaries to output the progress and last active, keyed by content_id
    output_progress_dict = {}
    output_last_active_dict = {}
    # Get a list of all the users that we are querying
    users = list(get_members_or_user(kwargs['collection_kind'], kwargs['collection_id']))

    # Get a list of all content ids for all target nodes and their descendants
    content_ids = target_nodes.get_descendants(include_self=True).order_by().values_list("content_id", flat=True)
    # get all summary logs for the current user that correspond to the content nodes and descendant content nodes
    # Filter by users and the content ids
    progress_query = ContentSummaryLog.objects\
        .filter(user__in=users, content_id__in=content_ids)
    # Conditionally filter by last active time
    if kwargs.get('last_active_time'):
        progress_query = progress_query.filter(end_timestamp__gte=parse(kwargs.get('last_active_time')))
    # Get an annotated list of dicts of type:
    # {
    #   'content_id': <content_id>,
    #   'kind': <kind>,
    #   'total_progress': <sum of all progress for this content>,
    #   'log_count_total': <number of summary logs for this content>,
    #   'log_count_complete': <number of complete summary logs for this content>,
    #   'last_active': <most recent end_timestamp for this content>,
    # }
    progress_list = progress_query.values('content_id', 'kind').annotate(
        total_progress=Sum('progress'),
        log_count_total=Count('pk'),
        log_count_complete=Sum(Case(When(progress=1, then=1), default=0, output_field=IntegerField())),
        last_active=Max('end_timestamp'))
    # Evaluate query and make a loop dict of all progress
    progress_dict = {item.get('content_id'): item for item in progress_list}
    if isinstance(target_nodes, ContentNode):
        # Have been passed an individual model
        target_nodes = [target_nodes]
    # Loop through each node to add progress and last active information to the output dicts
    for target_node in target_nodes:
        # In the case of a topic, we need to look at the progress and last active from each of its descendants
        if target_node.kind == content_kinds.TOPIC:
            # Get all the content_ids and kinds of each leaf node as a tuple
            # (about half the size of the dict from 'values' method)
            # Remove topics in generator comprehension, rather than using .exclude as kind is not indexed
            # Use set to remove repeated content
            leaf_nodes = set(node for node in target_node.get_descendants(include_self=False).order_by().values_list(
                'content_id', 'kind') if node[1] != content_kinds.TOPIC)
            # Get a unique set of all non-topic content kinds
            leaf_kinds = sorted(set(leaf_node[1] for leaf_node in leaf_nodes))
            # Create a list of progress summary dicts for each content kind
            progress = [{
                # For total progress sum across all the progress dicts for the descendant content leaf nodes
                'total_progress': reduce(
                    # Reduce with a function that just adds the total_progress of the passed in dict to the accumulator
                    sum_progress_dicts,
                    # Get all dicts of progress for every leaf_id that has some progress recorded
                    # and matches the kind we are aggregating over
                    (progress_dict.get(leaf_node[0]) for leaf_node in leaf_nodes\
                        if leaf_node[0] in progress_dict and leaf_node[1] == kind),
                    # Pass in an initial value of total_progress as zero to initialize the reduce
                    0.0,
                ),
                'kind': kind,
                # Count the number of leaf nodes of this particular kind
                'node_count': reduce(lambda x, y: x + int(y[1] == kind), leaf_nodes, 0)
            } for kind in leaf_kinds]
            # Set the output progress for this topic to this list of progress dicts
            output_progress_dict[target_node.content_id] = progress
            # Create a generator of last active times for the leaf_ids
            last_active_times = map(
                # Return the last active time for this leaf_node
                lambda leaf_node: progress_dict[leaf_node[0]]['last_active'],
                filter(
                    # Filter leaf_nodes to those that are in the progress_dict
                    lambda leaf_node: leaf_node[0] in progress_dict,
                    leaf_nodes))
            # Max does not handle empty iterables, so try this
            try:
                # If it is not empty, great!
                output_last_active_dict[target_node.content_id] = max(last_active_times)
            except (ValueError, TypeError):
                # If it is empty, catch the value error and set the last active time to None
                # If they are all none, catch the TypeError and also set to None
                output_last_active_dict[target_node.content_id] = None
        else:
            if target_node.content_id in progress_dict:
                progress = progress_dict.pop(target_node.content_id)
                output_last_active_dict[target_node.content_id] = progress.pop('last_active')
                # return as array for consistency in api
                output_progress_dict[target_node.content_id] = [{
                    'total_progress': progress['total_progress'],
                    'log_count_total': progress['log_count_total'],
                    'log_count_complete': progress['log_count_complete'],
                }]
            elif target_node.content_id not in output_progress_dict:
                # Not in the progress dict, but also not in our output, so supply default values
                output_last_active_dict[target_node.content_id] = None
                output_progress_dict[target_node.content_id] = [{
                    'total_progress': 0.0,
                    'log_count_total': 0,
                    'log_count_complete': 0,
                }]
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


class LessonReportSerializer(serializers.ModelSerializer):
    """
    Annotates a Lesson with a 'progress' array, which maps 1-to-1 with Lesson.resources.
    Each entry in the 'progress' array gives the total number of Learners who have
    been assigned the Lesson and have 'mastered' the Resource.
    """
    progress = serializers.SerializerMethodField()
    total_learners = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ('id', 'title', 'progress', 'total_learners',)

    def get_progress(self, instance):
        learners = instance.get_all_learners()
        if learners.count() is 0:
            return []

        return [self._resource_progress(r, learners) for r in instance.resources]

    def get_total_learners(self, instance):
        return instance.get_all_learners().count()

    def _resource_progress(self, resource, learners):
        response = {
            'contentnode_id': resource['contentnode_id'],
            'num_learners_completed': 0,
        }
        completed_content_logs = ContentSummaryLog.objects \
            .filter(
                content_id=resource['content_id'],
                user__in=learners,
                progress=1.0,
            ) \
            .values('content_id') \
            .annotate(total=Count('pk'))

        # If no logs for the Content Item,
        if completed_content_logs.count() is 0:
            return response
        else:
            response['num_learners_completed'] = completed_content_logs[0]['total']
            return response
