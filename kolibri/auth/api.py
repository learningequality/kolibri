from __future__ import absolute_import, print_function, unicode_literals

import time

from django.contrib.auth import authenticate, get_user, login, logout
from django.contrib.auth.models import AnonymousUser
from django.db.models.query import F
from kolibri.logger.models import UserSessionLog
from rest_framework import filters, permissions, status, viewsets
from rest_framework.response import Response

from .constants import collection_kinds
from .filters import HierarchyRelationsFilter
from .models import Classroom, DeviceOwner, Facility, FacilityDataset, FacilityUser, LearnerGroup, Membership, Role
from .serializers import (
    ClassroomSerializer, DeviceOwnerSerializer, FacilityDatasetSerializer, FacilitySerializer, FacilityUsernameSerializer, FacilityUserSerializer,
    LearnerGroupSerializer, MembershipSerializer, RoleSerializer
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


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class KolibriAuthPermissions(permissions.BasePermission):
    """
    A Django REST Framework permissions class that defers to Kolibri's permissions
    system to determine object-level permissions.
    """

    def has_permission(self, request, view):

        # as `has_object_permission` isn't called for POST/create, we need to check here
        if request.method == "POST" and request.data:
            model = view.serializer_class.Meta.model
            validated_data = view.serializer_class().to_internal_value(_ensure_raw_dict(request.data))
            return request.user.can_create(model, validated_data)

        # for other methods, we return True, as their permissions get checked below
        return True

    def has_object_permission(self, request, view, obj):
        # note that there is no entry for POST here, as creation is handled by `has_permission`, above
        if request.method in permissions.SAFE_METHODS:  # 'GET', 'OPTIONS' or 'HEAD'
            return request.user.can_read(obj)
        elif request.method in ["PUT", "PATCH"]:
            return request.user.can_update(obj)
        elif request.method == "DELETE":
            return request.user.can_delete(obj)
        else:
            return False


class FacilityDatasetViewSet(viewsets.ModelViewSet):
    permissions_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    serializer_class = FacilityDatasetSerializer

    def get_queryset(self):
        queryset = FacilityDataset.objects.filter(collection__kind=collection_kinds.FACILITY)
        facility_id = self.request.query_params.get('facility_id', None)
        if facility_id is not None:
            queryset = queryset.filter(collection__id=facility_id)
        return queryset


class FacilityUserFilter(filters.FilterSet):

    member_of = filters.django_filters.MethodFilter()

    def filter_member_of(self, queryset, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F("id"),
            ancestor_collection=value,
        )

    class Meta:
        model = FacilityUser


class FacilityUserViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = FacilityUser.objects.all()
    serializer_class = FacilityUserSerializer
    filter_class = FacilityUserFilter


class FacilityUsernameViewSet(viewsets.ReadOnlyModelViewSet):
    filter_backends = (filters.DjangoFilterBackend, filters.SearchFilter, )
    queryset = FacilityUser.objects.filter(dataset__learner_can_login_with_no_password=True, roles=None)
    serializer_class = FacilityUsernameSerializer
    filter_fields = ('facility', )
    search_fields = ('^username', )


class DeviceOwnerViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = DeviceOwner.objects.all()
    serializer_class = DeviceOwnerSerializer


class MembershipViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    filter_fields = ('user_id', 'collection_id')


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


class CurrentFacilityViewSet(viewsets.ViewSet):
    def list(self, request):
        logged_in_user = get_user(request)
        if type(logged_in_user) is DeviceOwner:
            return Response(Facility.objects.all().values_list('id', flat=True))
        elif type(logged_in_user) is AnonymousUser:
            return Response(Facility.objects.all().values_list('id', flat=True))
        else:
            return Response([logged_in_user.facility_id])


class ClassroomViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer


class LearnerGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer

    filter_fields = ('parent',)


class SignUpViewSet(viewsets.ViewSet):

    def extract_request_data(self, request):
        return {
            "username": request.data.get('username', ''),
            "full_name": request.data.get('full_name', ''),
            "password": request.data.get('password', ''),
            "facility": Facility.get_default_facility().id,
        }

    def create(self, request):

        data = self.extract_request_data(request)

        # we validate the user's input, and if valid, login as user
        serialized_user = FacilityUserSerializer(data=data)
        if serialized_user.is_valid():
            serialized_user.save()
            authenticated_user = authenticate(username=data['username'], password=data['password'], facility=data['facility'])
            login(request, authenticated_user)
            return Response(serialized_user.data, status=status.HTTP_201_CREATED)
        else:
            # grab error if related to username
            error = serialized_user.errors.get('username', None)
            return Response(error, status=status.HTTP_400_BAD_REQUEST)


class SessionViewSet(viewsets.ViewSet):

    def create(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        facility_id = request.data.get('facility', None)
        user = authenticate(username=username, password=password, facility=facility_id)
        if user is not None and user.is_active:
            # Correct password, and the user is marked "active"
            login(request, user)
            # Success!
            return Response(self.get_session(request))
        elif not password and (FacilityUser.objects.filter(username=username, facility=facility_id).exists() or
                               DeviceOwner.objects.filter(username=username).exists()):
            # Password was missing, but username is valid, prompt to give password
            return Response({
                "message": "Please provide password for user",
                "missing_field": "password"
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Respond with error
            return Response("User credentials invalid!", status=status.HTTP_401_UNAUTHORIZED)

    def destroy(self, request, pk=None):
        logout(request)
        return Response([])

    def retrieve(self, request, pk=None):
        return Response(self.get_session(request))

    def get_session(self, request):
        # Set last activity on session to the current time to prevent session timeout
        request.session['last_session_request'] = int(time.time())
        # Default to active, only assume not active when explicitly set.
        active = True if request.GET.get('active', 'true') == 'true' else False
        user = get_user(request)
        if isinstance(user, AnonymousUser):
            return {'id': 'current',
                    'username': '',
                    'full_name': '',
                    'user_id': None,
                    'facility_id': getattr(Facility.get_default_facility(), 'id', None),
                    'kind': ['anonymous'],
                    'error': '200'}

        session = {'id': 'current',
                   'username': user.username,
                   'full_name': user.full_name,
                   'user_id': user.id}
        if isinstance(user, DeviceOwner):
            session.update({'facility_id': getattr(Facility.get_default_facility(), 'id', None),
                            'kind': ['superuser'],
                            'error': '200'})
            return session
        else:
            roles = Role.objects.filter(user_id=user.id)
            if len(roles) is not 0:
                session.update({'facility_id': user.facility_id,
                                'kind': [],
                                'error': '200'})
                for role in roles:
                    if role.kind == 'admin':
                        session['kind'].append('admin')
                    else:
                        session['kind'].append('coach')
            else:
                session.update({'facility_id': user.facility_id,
                                'kind': ['learner'],
                                'error': '200'})
            if active:
                UserSessionLog.update_log(user)

            return session
