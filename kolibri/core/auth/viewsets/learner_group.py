import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from kolibri.core import error_constants
from kolibri.core.api import ValuesViewset
from kolibri.core.query import annotate_array_aggregate

from ..errors import InvalidCollectionHierarchy
from ..models import FacilityUser
from ..models import LearnerGroup
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter

logger = logging.getLogger(__name__)


class LearnerGroupSerializer(serializers.ModelSerializer):
    user_ids = serializers.ListField(child=serializers.UUIDField(), read_only=True)

    class Meta:
        model = LearnerGroup
        fields = ("id", "name", "parent", "user_ids")

        validators = [
            UniqueTogetherValidator(
                queryset=LearnerGroup.objects.all(), fields=("parent", "name")
            )
        ]

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except InvalidCollectionHierarchy as e:
            raise serializers.ValidationError(
                "Invalid collection hierarchy",
                code=error_constants.INVALID,
            ) from e


class LearnerGroupViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer

    filterset_fields = ("parent",)

    def annotate_queryset(self, queryset):
        # See #13759: filter excludes soft-deleted (anonymized) users from user_ids.
        return annotate_array_aggregate(
            queryset,
            filter=FacilityUser.get_is_active_q("membership"),
            user_ids="membership__user__id",
        )
