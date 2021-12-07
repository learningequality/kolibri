"""
Avoiding direct model imports in here so that we can import these functions into places
that should not initiate the Django app registry.
"""
import hashlib

try:
    from django.contrib.postgres.aggregates import BitOr
except ImportError:
    BitOr = None

from django.db import connections
from django.db.models import Aggregate
from django.db.models import Case
from django.db.models import Value
from django.db.models import When
from django.db.models.fields import IntegerField
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


metadata_bitmasks = {}

bitmask_fieldnames = {}


for key, labels in metadata_lookup.items():
    bitmask_lookup = {}
    i = 0
    while labels[i : i + 64]:
        bitmask_field_name = "{}_bitmask_{}".format(key, i)
        bitmask_fieldnames[bitmask_field_name] = []
        for j, label in enumerate(labels):
            info = {
                "bitmask_field_name": bitmask_field_name,
                "field_name": key,
                "bits": 2 ** j,
                "label": label,
            }
            bitmask_lookup[label] = info
            bitmask_fieldnames[bitmask_field_name].append(info)
        i += 64
    metadata_bitmasks[key] = bitmask_lookup


def _get_available_languages(base_queryset):
    lang_ids = (
        base_queryset.exclude(lang=None).values_list("lang_id", flat=True).distinct()
    )
    return list(lang_ids)


def _get_available_channels(base_queryset):
    return list(base_queryset.values_list("channel_id", flat=True).distinct())


class SQLiteBitwiseORAggregate(Aggregate):
    name = "BitwiseOR"

    def __init__(self, expression, num_bits=None, **extra):
        if not num_bits:
            raise ValueError("num_bits must be a positive integer")
        self.num_bits = num_bits
        super(SQLiteBitwiseORAggregate, self).__init__(
            expression, output_field=IntegerField(), **extra
        )

    @property
    def template(self):
        return " + ".join(
            "max(%(expressions)s&{})".format(2 ** i) for i in range(0, self.num_bits)
        )


def get_available_metadata_labels(base_queryset):
    from kolibri.core.device.models import ContentCacheKey

    content_cache_key = ContentCacheKey.get_cache_key()
    cache_key = "search-labels:{}:{}".format(
        content_cache_key,
        hashlib.md5(str(base_queryset.query).encode("utf8")).hexdigest(),
    )
    if cache_key not in cache:
        base_queryset = base_queryset.order_by()
        aggregates = {}
        for field in bitmask_fieldnames:
            field_agg = field + "_agg"
            if connections[base_queryset.db].vendor == "sqlite" or BitOr is None:
                aggregates[field_agg] = SQLiteBitwiseORAggregate(
                    field, num_bits=len(bitmask_fieldnames[field])
                )
            elif connections[base_queryset.db].vendor == "postgresql":
                aggregates[field_agg] = BitOr(field)
        output = {}
        agg = base_queryset.aggregate(**aggregates)
        for field, values in bitmask_fieldnames.items():
            bit_value = agg[field + "_agg"]
            for value in values:
                if value["field_name"] not in output:
                    output[value["field_name"]] = []
                if bit_value is not None and bit_value & value["bits"]:
                    output[value["field_name"]].append(value["label"])
        output["languages"] = _get_available_languages(base_queryset)
        output["channels"] = _get_available_channels(base_queryset)
        cache.set(cache_key, output, timeout=None)
    return cache.get(cache_key)


def get_all_contentnode_label_metadata():
    from kolibri.core.content.models import ContentNode

    return get_available_metadata_labels(ContentNode.objects.filter(available=True))


def annotate_label_bitmasks(queryset):
    update_statements = {}
    for bitmask_fieldname, label_info in bitmask_fieldnames.items():
        update_statements[bitmask_fieldname] = sum(
            Case(
                When(
                    **{
                        info["field_name"] + "__contains": info["label"],
                        "then": Value(info["bits"]),
                    }
                ),
                default=Value(0),
            )
            for info in label_info
        )
    queryset.update(**update_statements)
