"""
Avoiding direct model imports in here so that we can import these functions into places
that should not initiate the Django app registry.
"""
import hashlib

from django.db.models import Exists
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST

from kolibri.core.utils.cache import process_cache as cache


metadata_lookup = {
    "learning_activities": LEARNINGACTIVITIESLIST,
    "categories": SUBJECTSLIST,
    "grade_levels": LEVELSLIST,
    "accessibility_labels": ACCESSIBILITYCATEGORIESLIST,
    "learner_needs": NEEDSLIST,
}


def _get_available_languages(base_queryset):
    from kolibri.core.content.models import Language

    lang_ids = (
        base_queryset.exclude(lang=None)
        .order_by("lang_id")
        .values_list("lang_id", flat=True)
    )
    return list(
        Language.objects.filter(id__in=lang_ids)
        .distinct()
        .order_by("id")
        .values("id", "lang_name")
    )


def _get_available_channels(base_queryset):
    from kolibri.core.content.models import ChannelMetadata

    return list(
        ChannelMetadata.objects.filter(
            id__in=base_queryset.values_list("channel_id", flat=True).distinct()
        )
        .order_by("order")
        .values("id", "name", "thumbnail")
    )


def get_available_metadata_labels(
    base_queryset, limit_to_known_fields=True, force=False
):
    from kolibri.core.device.models import ContentCacheKey

    content_cache_key = ContentCacheKey.get_cache_key()
    cache_key = "search-labels:{}:{}".format(
        content_cache_key,
        hashlib.md5(str(base_queryset.query).encode("utf8")).hexdigest(),
    )
    if cache_key not in cache or force:
        base_queryset = base_queryset.values("id").order_by()
        queryset = base_queryset
        all_values = []
        if limit_to_known_fields:
            lookup = _get_all_contentnode_label_metadata()
            lookup.pop("channels")
            lookup.pop("languages")
        else:
            lookup = metadata_lookup
        for field, values in lookup.items():
            queryset = queryset.annotate(
                **{
                    value: Exists(base_queryset.filter(**{field + "__contains": value}))
                    for value in values
                }
            )
            all_values += values
        result = queryset.values(*all_values).first()
        output = {}
        for field, values in lookup.items():
            output[field] = [v for v in values if result and result.get(v)]
        output["languages"] = _get_available_languages(base_queryset)
        output["channels"] = _get_available_channels(base_queryset)
        cache.set(cache_key, output, timeout=None)
    return cache.get(cache_key)


def update_all_contentnode_label_metadata():
    from kolibri.core.content.models import ContentNode

    base_queryset = ContentNode.objects.filter(available=True)
    get_available_metadata_labels(
        base_queryset, limit_to_known_fields=False, force=True
    )


def _get_all_contentnode_label_metadata():
    from kolibri.core.content.models import ContentNode

    return get_available_metadata_labels(
        ContentNode.objects.filter(available=True), limit_to_known_fields=False
    )


def get_categories():
    return _get_all_contentnode_label_metadata()["categories"]


def get_learning_activities():
    return _get_all_contentnode_label_metadata()["learning_activities"]


def get_languages():
    return _get_all_contentnode_label_metadata()["languages"]


def get_channels():
    return _get_all_contentnode_label_metadata()["channels"]


def get_grade_levels():
    return _get_all_contentnode_label_metadata()["grade_levels"]


def get_accessiblity_labels():
    return _get_all_contentnode_label_metadata()["accessibility_labels"]


def get_learner_needs():
    return _get_all_contentnode_label_metadata()["learner_needs"]
