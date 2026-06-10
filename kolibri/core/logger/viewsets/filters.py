from django.db.models import Q
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter


class BaseLogFilter(FilterSet):
    facility = UUIDFilter(method="filter_facility")
    classroom = UUIDFilter(method="filter_classroom")
    learner_group = UUIDFilter(method="filter_learner_group")

    # Only a superuser can filter by facilities
    def filter_facility(self, queryset, name, value):
        return queryset.filter(user__facility=value)

    def filter_classroom(self, queryset, name, value):
        return queryset.filter(
            Q(user__memberships__collection_id=value)
            | Q(user__memberships__collection__parent_id=value)
        )

    def filter_learner_group(self, queryset, name, value):
        return queryset.filter(user__memberships__collection_id=value)
