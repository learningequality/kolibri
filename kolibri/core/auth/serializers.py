from django.db.models import Q
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.query import annotate_array_aggregate


class AssignableCollectionField(PrimaryKeyRelatedField):
    def __init__(self, **kwargs):
        kwargs.setdefault(
            "queryset", Collection.objects.exclude(kind=ADHOCLEARNERSGROUP)
        )
        super().__init__(**kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.context["request"].user
        if user.is_superuser:
            return queryset
        role_collection_ids = Role.objects.filter(
            user_id=user.id, kind__in=(role_kinds.ADMIN, role_kinds.COACH)
        ).values("collection_id")
        return queryset.filter(
            Q(id__in=role_collection_ids)
            | Q(parent_id__in=role_collection_ids)
            | Q(parent__parent_id__in=role_collection_ids)
        )


def consolidate_assignments(items, assignment_model, parent_field):
    assignments = annotate_array_aggregate(
        assignment_model.objects.filter(
            **{f"{parent_field}_id__in": [item["id"] for item in items]}
        ),
        # filter to active members only — deactivated users must not appear in learner_ids
        filter=Q(collection__kind=ADHOCLEARNERSGROUP)
        & FacilityUser.get_is_active_q("collection__membership"),
        learner_ids="collection__membership__user_id",
    )
    collections_by_parent = {}
    learner_ids_by_parent = {}
    for a in assignments.values(
        "collection", "collection__kind", parent_field, "learner_ids"
    ):
        if a["collection__kind"] == ADHOCLEARNERSGROUP:
            learner_ids_by_parent[a[parent_field]] = a["learner_ids"]
        else:
            collections_by_parent.setdefault(a[parent_field], []).append(
                a["collection"]
            )
    for item in items:
        item["assignments"] = collections_by_parent.get(item["id"], [])
        item["learner_ids"] = learner_ids_by_parent.get(item["id"], [])
