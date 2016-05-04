from rest_framework import filters, permissions, viewsets

from .models import (
    Classroom, DeviceOwner, Facility, FacilityUser, LearnerGroup, Membership,
    Role
)
from .serializers import (
    ClassroomSerializer, DeviceOwnerSerializer, FacilitySerializer,
    FacilityUserSerializer, LearnerGroupSerializer, MembershipSerializer,
    RoleSerializer
)


class KolibriAuthPermissionsFilter(filters.BaseFilterBackend):
    """
    A Django REST Framework filter backend that limits results to those where the
    requesting user has read object level permissions. This filtering is delegated
    to the ``filter_readable`` method on ``KolibriAbstractBaseUser``.
    """

    def filter_queryset(self, request, queryset, view):
        if request.method == "GET" and request.resolver_match.url_name.endswith("-list"):
            # only filter down the queryset in the case of the list view being requested
            return request.user.filter_readable(queryset)
        else:
            # otherwise, return the full queryset, as permission checks will happen object-by-object
            # (and filtering here then leads to 404's instead of the more correct 403's)
            return queryset


class KolibriAuthPermissions(permissions.BasePermission):
    """
    A Django REST Framework permissions class that defers to Kolibri's permissions
    system to determine object-level permissions.
    """

    def has_permission(self, request, view):

        # as `has_object_permission` isn't called for POST/create, we need to check here
        if request.method == "POST" and request.data:
            model = view.serializer_class.Meta.model
            validated_data = view.serializer_class().to_internal_value(request.data.dict())
            return request.user.can_create(model, validated_data)

        # for other methods, we return True, as their permissions get checked below
        return True

    def has_object_permission(self, request, view, obj):
        if request.method == "POST":
            # this shouldn't get called under normal API use (as actual creation is checked above under
            # ``has_permission``), but this gets called by the browsable API when generating a form
            return request.user.can_create_instance(obj)
        elif request.method in permissions.SAFE_METHODS:  # 'GET', 'OPTIONS' or 'HEAD'
            return request.user.can_read(obj)
        elif request.method == "PUT":
            return request.user.can_update(obj)
        elif request.method == "DELETE":
            return request.user.can_delete(obj)
        else:
            return False


class FacilityUserViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = FacilityUser.objects.all()
    serializer_class = FacilityUserSerializer


class DeviceOwnerViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = DeviceOwner.objects.all()
    serializer_class = DeviceOwnerSerializer


class MembershipViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Role.objects.all()
    serializer_class = RoleSerializer


class FacilityViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer


class ClassroomViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer


class LearnerGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer
