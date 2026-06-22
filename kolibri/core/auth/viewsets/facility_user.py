import logging
from uuid import UUID

from django.contrib.auth import update_session_auth_hash
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import DateTimeFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from django_filters.rest_framework import UUIDFilter
from morango.api.permissions import BasicMultiArgumentAuthentication
from rest_framework import decorators
from rest_framework import filters
from rest_framework import serializers
from rest_framework import status
from rest_framework.mixins import DestroyModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from kolibri.core import error_constants
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesViewset
from kolibri.core.api import ValuesViewsetOrderingFilter
from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility
from kolibri.core.auth.tasks import cleanup_expired_deleted_users
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.utils.pagination import OptionalPageNumberPagination

from ..constants import role_kinds
from ..constants.demographics import DEFERRED
from ..constants.demographics import NOT_SPECIFIED
from ..errors import NoAvailableSequences
from ..models import Collection
from ..models import Facility
from ..models import FacilityUser
from ..models import Role
from ..models import validate_username_allowed_chars
from ..models import validate_username_max_length
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter
from ..utils.picture_passwords import are_picture_passwords_exhausted
from ..utils.picture_passwords import assign_picture_password

logger = logging.getLogger(__name__)


class UUIDInFilter(BaseInFilter, UUIDFilter):
    pass


class ModelChoiceInFilter(BaseInFilter, ModelChoiceFilter):
    pass


class ChoiceInFilter(BaseInFilter, ChoiceFilter):
    pass


class FacilityUserFilter(FilterSet):
    USER_TYPE_CHOICES = (
        ("learner", "learner"),
        ("superuser", "superuser"),
    ) + role_kinds.choices

    member_of = ModelChoiceFilter(
        method="filter_member_of", queryset=Collection.objects.all()
    )
    related_to__in = ModelChoiceInFilter(
        method="filter_related_to__in", queryset=Collection.objects.all()
    )
    user_type = ChoiceFilter(
        choices=USER_TYPE_CHOICES,
        method="filter_user_type",
    )
    user_type__in = ChoiceInFilter(
        choices=USER_TYPE_CHOICES,
        method="filter_user_type",
    )
    exclude_member_of = ModelChoiceFilter(
        method="filter_exclude_member_of", queryset=Collection.objects.all()
    )
    exclude_coach_for = ModelChoiceFilter(
        method="filter_exclude_coach_for", queryset=Collection.objects.all()
    )
    exclude_user_type = ChoiceFilter(
        choices=USER_TYPE_CHOICES,
        method="filter_exclude_user_type",
    )
    date_joined__gte = DateTimeFilter(
        field_name="date_joined",
        lookup_expr="gte",
    )
    date_joined__lte = DateTimeFilter(
        field_name="date_joined",
        lookup_expr="lte",
    )
    birth_year_gte = CharFilter(method="filter_birth_year_gte")
    birth_year_lte = CharFilter(method="filter_birth_year_lte")

    by_ids = UUIDInFilter(field_name="id")

    def filter_member_of(self, queryset, name, value):
        return queryset.filter(Q(memberships__collection=value) | Q(facility=value))

    def filter_related_to__in(self, queryset, name, value):
        """
        Filter users related to any of the collections in the provided value. Related through
        memberships, facility, or roles.
        """
        return queryset.filter(
            Q(memberships__collection__in=value)
            | Q(facility__in=value)
            | Q(roles__collection__in=value)
        )

    def filter_user_type(self, queryset, name, value):
        if isinstance(value, str):
            value = [value]

        user_type_filter = Q()

        if "learner" in value:
            user_type_filter |= Q(roles__isnull=True)

        if "coach" in value:
            # Return users with either coach or classroom assignable coach roles
            user_type_filter |= Q(roles__kind=role_kinds.COACH) | Q(
                roles__kind=role_kinds.ASSIGNABLE_COACH
            )
        if "superuser" in value:
            user_type_filter |= Q(devicepermissions__is_superuser=True)

        rest_filters = [
            user_type_value
            for user_type_value in value
            if user_type_value not in ["learner", "coach", "superuser"]
        ]

        if rest_filters:
            user_type_filter |= Q(roles__kind__in=rest_filters)

        return queryset.filter(user_type_filter)

    def filter_exclude_member_of(self, queryset, name, value):
        return queryset.exclude(Q(memberships__collection=value) | Q(facility=value))

    def filter_exclude_coach_for(self, queryset, name, value):
        return queryset.exclude(
            Q(
                roles__in=Role.objects.filter(
                    Q(kind=role_kinds.COACH) | Q(kind=role_kinds.ASSIGNABLE_COACH),
                    collection=value,
                )
            )
        )

    def filter_exclude_user_type(self, queryset, name, value):
        if value == "learner":
            return queryset.exclude(roles__isnull=True)
        if value == "superuser":
            return queryset.exclude(devicepermissions__is_superuser=True)
        return queryset.exclude(roles__kind=value)

    def filter_birth_year_gte(self, queryset, name, value):
        queryset = queryset.exclude(
            Q(birth_year__isnull=True)
            | Q(birth_year=NOT_SPECIFIED)
            | Q(birth_year=DEFERRED)
        )

        return queryset.filter(Q(birth_year__gte=value))

    def filter_birth_year_lte(self, queryset, name, value):
        queryset = queryset.exclude(
            Q(birth_year__isnull=True)
            | Q(birth_year=NOT_SPECIFIED)
            | Q(birth_year=DEFERRED)
        )

        return queryset.filter(Q(birth_year__lte=value))

    class Meta:
        model = FacilityUser
        fields = [
            "member_of",
            "related_to__in",
            "user_type",
            "user_type__in",
            "exclude_member_of",
            "exclude_user_type",
            "by_ids",
            "date_joined__gte",
            "date_joined__lte",
            "birth_year_gte",
            "birth_year_lte",
        ]


class FacilityUserRoleSerializer(serializers.ModelSerializer):
    """Read-only role serializer for FacilityUser API responses.

    Excludes 'user' since it's redundant when nested inside a user response.
    """

    class Meta:
        model = Role
        fields = ("id", "kind", "collection")


class FacilityUserSerializer(serializers.ModelSerializer):
    roles = FacilityUserRoleSerializer(many=True, read_only=True)
    is_superuser = serializers.BooleanField(
        source="devicepermissions.is_superuser", default=False, read_only=True
    )
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        default=Facility.get_default_facility,
        required=False,
        error_messages={"does_not_exist": "Facility does not exist."},
    )
    extra_demographics = serializers.JSONField(required=False)

    class Meta:
        model = FacilityUser
        extra_kwargs = {"password": {"write_only": True}}
        fields = (
            "id",
            "username",
            "full_name",
            "password",
            "facility",
            "roles",
            "is_superuser",
            "id_number",
            "gender",
            "birth_year",
            "extra_demographics",
            "picture_password",
            "date_joined",
        )
        read_only_fields = ("is_superuser", "picture_password")

    def save(self, **kwargs):
        instance = super().save(**kwargs)
        validated_data = dict(list(self.validated_data.items()) + list(kwargs.items()))
        password = validated_data.get("password")
        # DRF does not call set_password(); explicit call is needed to hash (bc42e60).
        if password and password != NOT_SPECIFIED:
            instance.set_password(password)
            instance.save()
        return instance

    def create(self, validated_data):
        with transaction.atomic():
            instance = super().create(validated_data)
            facility = instance.facility
            if (
                facility.dataset.picture_password_settings is not None
                and not are_picture_passwords_exhausted(instance.dataset_id)
            ):
                try:
                    assign_picture_password(instance, instance.facility)
                except NoAvailableSequences:
                    pass
        return instance

    def _validate_extra_demographics(self, attrs, facility):
        # Validate the extra demographics here, as we need access to the facility dataset
        extra_demographics = attrs.get("extra_demographics")
        if extra_demographics:
            try:
                facility.dataset.validate_demographic_data(extra_demographics)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"extra_demographics": e.message})

    def validate(self, attrs):
        username = attrs.get("username", None)
        if username is not None:
            # in case a patch request does not provide username attribute
            try:
                validate_username_allowed_chars(username)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"username": e.message})

            try:
                validate_username_max_length(username)
            except DjangoValidationError as e:
                raise serializers.ValidationError(
                    {"username": e.message}, code=error_constants.MAX_LENGTH
                )

        # first condition is for creating object, second is for updating
        facility = attrs.get("facility") or getattr(self.instance, "facility")
        if (
            "password" in attrs
            and attrs["password"] == NOT_SPECIFIED
            and not facility.dataset.learner_can_login_with_no_password
        ):
            raise serializers.ValidationError(
                "No password specified and it is required",
                code=error_constants.PASSWORD_NOT_SPECIFIED,
            )
        self._validate_extra_demographics(attrs, facility)

        # if obj doesn't exist, return data
        try:
            obj = FacilityUser.objects.get(username__iexact=username, facility=facility)
        except FacilityUser.DoesNotExist:
            return attrs
        # if we are updating object, and this `instance` is the same object, return data
        if self.instance and obj.id == self.instance.id:
            return attrs
        else:
            raise serializers.ValidationError(
                "An account with that username already exists.",
                code=error_constants.USERNAME_ALREADY_EXISTS,
            )


class DeletedFacilityUserSerializer(FacilityUserSerializer):
    class Meta(FacilityUserSerializer.Meta):
        fields = FacilityUserSerializer.Meta.fields + ("date_deleted",)


class PublicFacilityUserSerializer(serializers.ModelSerializer):
    """Read-only serializer for the public (device-to-device) user API."""

    roles = serializers.CharField(source="roles.kind", read_only=True)
    is_superuser = serializers.BooleanField(
        source="devicepermissions.is_superuser", default=False, read_only=True
    )

    class Meta:
        model = FacilityUser
        fields = (
            "id",
            "username",
            "full_name",
            "facility",
            "roles",
            "is_superuser",
            "id_number",
            "gender",
            "birth_year",
        )


class PublicFacilityUserViewSet(ReadOnlyValuesViewset):
    queryset = FacilityUser.objects.all().order_by("id")
    serializer_class = PublicFacilityUserSerializer
    authentication_classes = [BasicMultiArgumentAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return FacilityUser.objects.none()
        facility_id = self.request.query_params.get(
            "facility_id", self.request.user.facility_id
        )
        try:
            # Normalize to hex to validate format and strip dashes before filtering (d41d6d2).
            facility_id = UUID(facility_id).hex
        except ValueError:
            return self.queryset.none()

        # if user has admin rights for the facility returns the list of users
        queryset = self.queryset.filter(facility_id=facility_id)
        # otherwise, the endpoint returns only the user information
        if not self.request.user.is_superuser and not _user_is_admin_for_own_facility(
            self.request.user
        ):
            queryset = queryset.filter(id=self.request.user.id)

        return queryset


class FacilityUserViewSet(ValuesViewset, BulkDeleteMixin):
    permission_classes = (KolibriAuthPermissions,)
    pagination_class = OptionalPageNumberPagination
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.SearchFilter,
        ValuesViewsetOrderingFilter,
    )
    order_by_field = "username"

    queryset = FacilityUser.objects.all().order_by(order_by_field)
    serializer_class = FacilityUserSerializer
    filterset_class = FacilityUserFilter

    search_fields = ("username", "full_name")

    ordering_fields = (
        "id",
        "username",
        "full_name",
        "id_number",
        "gender",
        "birth_year",
        "date_joined",
    )

    def destroy(self, request, *args, **kwargs):
        if kwargs.get("pk"):
            # Single object deletion
            user = self.get_object()
            user.date_deleted = now()
            user.save()
            try:
                # Eagerly trigger hard-delete cleanup after every soft-delete (#13591).
                cleanup_expired_deleted_users.enqueue()
            except JobRunning:
                pass  # Task is already running, do nothing
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            # Bulk deletion
            return self.bulk_destroy(request, *args, **kwargs)

    def perform_bulk_destroy(self, objects):
        # Prevents superuser self-deletion during bulk operations (#13483).
        if objects.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Super user cannot delete self")
        objects.update(date_deleted=now())

    def perform_update(self, serializer):
        instance = serializer.save()
        # if the user is updating their own password, ensure they don't get logged out
        if self.request.user == instance:
            update_session_auth_hash(self.request, instance)


class DeletedFacilityUserViewSet(
    ReadOnlyValuesViewset,
    DestroyModelMixin,
    BulkDeleteMixin,
):
    """Viewset for managing soft-deleted FacilityUsers."""

    permission_classes = (KolibriAuthPermissions,)
    pagination_class = OptionalPageNumberPagination
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.SearchFilter,
        ValuesViewsetOrderingFilter,
    )

    order_by_field = "date_deleted"
    queryset = FacilityUser.soft_deleted_objects.all().order_by(order_by_field)
    serializer_class = DeletedFacilityUserSerializer
    filterset_class = FacilityUserFilter

    search_fields = FacilityUserViewSet.search_fields
    ordering_fields = FacilityUserViewSet.ordering_fields + ("date_deleted",)

    @decorators.action(detail=False, methods=["post"])
    def restore(self, request):
        """
        Restore soft-deleted FacilityUsers.
        """
        # Permissions for allowing bulk restore are the same as for bulk destroy
        if not self.allow_bulk_destroy():
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
            )

        users = self.filter_queryset(self.get_queryset())
        if not users.exists():
            raise Http404("No deleted users found to restore.")

        users.update(date_deleted=None)

        return Response(status=status.HTTP_204_NO_CONTENT)
