from itertools import islice
from random import sample
from typing import ClassVar

from django.core.cache import cache
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.aggregates import Count
from django.db.models.aggregates import Max
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds

from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ListModelMixin
from kolibri.core.api import ValuesViewsetOrderingFilter
from kolibri.core.content import models
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog

from .base import InternalContentNodeMixin
from .filters import contentnode_filter_fields
from .filters import ContentNodeFilter
from .filters import OptionalPagination
from .filters import select_node_ids
from .virtual import admitted_node_ids

POPULAR_LIMIT = 20
POPULAR_BATCH_SIZE = 100


def _representative_node_ids(content_ids):
    content_ids = set(content_ids)
    fallback_ids = {}
    if content_ids:
        for node_id, content_id in (
            models.ContentNode.objects.filter(
                available=True, content_id__in=content_ids
            )
            .order_by("content_id", "id")
            .values_list("id", "content_id")
        ):
            fallback_ids.setdefault(content_id, node_id)
    return fallback_ids


def _available_node_ids(content_ids, available):
    instance_ids = {}
    for content_id, instance_id in (
        ContentSessionLog.objects.filter(
            content_id__in=content_ids, instance_id__isnull=False
        )
        .values("content_id", "instance_id")
        .annotate(last=Max("end_timestamp"))
        .order_by(F("last").desc(nulls_last=True))
        .values_list("content_id", "instance_id")
    ):
        instance_ids.setdefault(content_id, instance_id)

    # Unavailable instances aren't replaced by content_id: channels are distinct.
    admitted = set(admitted_node_ids(list(instance_ids.values()), available))
    chosen = {
        content_id: node_id
        for content_id, node_id in instance_ids.items()
        if node_id in admitted
    }
    chosen.update(
        _representative_node_ids(
            content_id for content_id in content_ids if content_id not in instance_ids
        )
    )
    return [chosen[content_id] for content_id in content_ids if content_id in chosen]


def _popular_node_ids():
    available = models.ContentNode.objects.filter(available=True)
    ranked = (
        ContentSessionLog.objects.filter(
            Q(content_id__in=available.values("content_id"))
            | Q(instance_id__isnull=False)
        )
        .values_list("content_id", flat=True)
        .annotate(Count("content_id"))
        .order_by("-content_id__count", "content_id")
        .iterator(chunk_size=POPULAR_BATCH_SIZE)
    )
    node_ids = []
    while len(node_ids) < POPULAR_LIMIT:
        content_ids = list(islice(ranked, POPULAR_BATCH_SIZE))
        if not content_ids:
            break
        node_ids.extend(_available_node_ids(content_ids, available))
    return node_ids[:POPULAR_LIMIT]


class UserContentNodeFilter(ContentNodeFilter):
    lesson = UUIDFilter(method="filter_by_lesson")
    resume = BooleanFilter(method="filter_by_resume")
    next_steps = BooleanFilter(method="filter_by_next_steps")
    popular = BooleanFilter(method="filter_by_popular")

    def filter_by_lesson(self, queryset, name, value):
        lesson = (
            Lesson.objects.filter(
                lesson_assignments__collection__membership__user=self.request.user,
                is_active=True,
                pk=value,
            ).first()
            if self.request.user.is_authenticated
            else None
        )
        if lesson is None:
            return queryset.none()
        select_node_ids(self.request, [x["contentnode_id"] for x in lesson.resources])
        return queryset

    def filter_by_resume(self, queryset, name, value):
        user = self.request.user
        # if user is anonymous, don't return any nodes
        if user.is_anonymous:
            return queryset.none()
        # get the most recently viewed, but not finished, content nodes
        logs = list(
            ContentSummaryLog.objects.filter(user=user, progress__gt=0)
            .exclude(progress=1)
            .order_by("-end_timestamp")
            .values("content_id", "instance_id")
        )
        # Unavailable instances aren't replaced by content_id: channels are distinct.
        fallback_ids = _representative_node_ids(
            {log["content_id"] for log in logs if not log["instance_id"]}
        )

        ordered_ids = []
        seen = set()
        for log in logs:
            node_id = log["instance_id"] or fallback_ids.get(log["content_id"])
            if node_id is None or node_id in seen:
                continue
            seen.add(node_id)
            ordered_ids.append(node_id)

        select_node_ids(self.request, ordered_ids)
        return queryset

    def filter_by_next_steps(self, queryset, name, value):
        """
        Recommend content that has user completed content as a prerequisite, or leftward sibling.

        :param request: request object
        :return: uncompleted content nodes, or empty queryset if user is anonymous
        """
        user = self.request.user
        # if user is anonymous, don't return any nodes
        # if person requesting is not the data they are requesting for, also return no nodes
        if user.is_anonymous:
            return queryset.none()
        completed_content_ids = ContentSummaryLog.objects.filter(
            user=user, progress=1
        ).values_list("content_id", flat=True)

        # If no logs, don't bother doing the other queries
        if not completed_content_ids.exists():
            return queryset.none()
        completed_content_nodes = queryset.filter_by_content_ids(
            completed_content_ids
        ).order_by()

        # Filter to only show content that the user has not engaged in, so as not to be redundant with resume
        queryset = (
            queryset.exclude_by_content_ids(
                ContentSummaryLog.objects.filter(user=user).values_list(
                    "content_id", flat=True
                ),
                validate=False,
            )
            .filter(
                Q(has_prerequisite__in=completed_content_nodes)
                | Q(
                    lft__in=[
                        rght + 1
                        for rght in completed_content_nodes.values_list(
                            "rght", flat=True
                        )
                    ]
                )
            )
            .order_by()
        )
        if not (
            user.roles.exists() or user.is_superuser
        ):  # must have coach role or higher
            queryset = queryset.exclude(coach_content=True)

        return queryset

    def filter_by_popular(self, queryset, name, value):
        """
        Recommend content that is popular with all users.

        :param request: request object
        :return: 10 most popular content nodes
        """
        cache_key = "popular_content_node_ids"

        ordered_ids = cache.get(cache_key)

        if ordered_ids is None:
            if len(ContentSessionLog.objects.values_list("pk")[:50]) < 50:
                # return 25 random content nodes if not enough session logs
                pks = queryset.values_list("pk", flat=True).exclude(
                    kind=content_kinds.TOPIC
                )
                # .count scales with table size, so can get slow on larger channels
                count_cache_key = "content_count_for_popular"
                count = cache.get(count_cache_key) or min(pks.count(), 25)
                return queryset.filter_by_uuids(
                    sample(list(pks), count), validate=False
                )
            ordered_ids = _popular_node_ids()

            # cache the popular results node ids for 10 minutes, for efficiency
            cache.set(cache_key, ordered_ids, 60 * 10)

        select_node_ids(self.request, ordered_ids)
        return queryset

    class Meta:
        model = models.ContentNode
        fields: ClassVar[list] = [*contentnode_filter_fields, "resume", "lesson"]


class UserContentNodeViewset(
    InternalContentNodeMixin, BaseValuesViewset, ListModelMixin
):
    """
    A content node viewset for filtering on user specific fields.
    """

    filter_backends = (DjangoFilterBackend, ValuesViewsetOrderingFilter)
    ordering_fields: ClassVar[list] = ["last_interacted"]
    ordering = ("lft", "id")
    filterset_class = UserContentNodeFilter
    pagination_class = OptionalPagination

    def get_queryset(self):
        user = self.request.user

        queryset = models.ContentNode.objects.filter(available=True)
        if user.is_anonymous:
            user = None

        return queryset.annotate(
            last_interacted=Subquery(
                ContentSummaryLog.objects.filter(
                    content_id=OuterRef("content_id"), user=user
                ).values_list("end_timestamp")[:1]
            )
        )

    def list(self, request, *args, **kwargs):
        return self.list_nodes(request)
