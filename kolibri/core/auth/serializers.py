from django.db.models import Q
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Role


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
