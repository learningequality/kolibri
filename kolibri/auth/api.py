from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import time

from django.contrib.auth import authenticate
from django.contrib.auth import get_user
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.db.models import Q
from django.db.models.query import F
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from rest_framework import filters
from rest_framework import permissions
from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response

from .constants import collection_kinds
from .filters import HierarchyRelationsFilter
from .models import Classroom
from .models import Collection
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .serializers import ClassroomSerializer
from .serializers import FacilityDatasetSerializer
from .serializers import FacilitySerializer
from .serializers import FacilityUsernameSerializer
from .serializers import FacilityUserSerializer
from .serializers import FacilityUserSignupSerializer
from .serializers import LearnerGroupSerializer
from .serializers import MembershipSerializer
from .serializers import PublicFacilitySerializer
from .serializers import RoleSerializer
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.logger.models import UserSessionLog


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
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(_ensure_raw_dict(datum))
        return request.user.can_create(model, validated_data)

    def has_permission(self, request, view):

        # as `has_object_permission` isn't called for POST/create, we need to check here
        if request.method == "POST" and request.data:
            if type(request.data) is list:
                data = request.data
            else:
                data = [request.data]

            return all(self.validator(request, view, datum) for datum in data)

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
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    serializer_class = FacilityDatasetSerializer

    def get_queryset(self):
        queryset = FacilityDataset.objects.filter(collection__kind=collection_kinds.FACILITY)
        facility_id = self.request.query_params.get('facility_id', None)
        if facility_id is not None:
            queryset = queryset.filter(collection__id=facility_id)
        return queryset


class FacilityUserFilter(FilterSet):

    member_of = ModelChoiceFilter(method="filter_member_of", queryset=Collection.objects.all())

    def filter_member_of(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F("id"),
            ancestor_collection=value,
        )

    class Meta:
        model = FacilityUser
        fields = ["member_of", ]


class FacilityUserViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = FacilityUser.objects.all()
    serializer_class = FacilityUserSerializer
    filter_class = FacilityUserFilter

    def set_password_if_needed(self, instance, serializer):
        with transaction.atomic():
            if serializer.validated_data.get('password', ''):
                instance.set_password(serializer.validated_data['password'])
                instance.save()
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self.set_password_if_needed(instance, serializer)
        # if the user is updating their own password, ensure they don't get logged out
        if self.request.user == instance:
            update_session_auth_hash(self.request, instance)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.set_password_if_needed(instance, serializer)


class FacilityUsernameViewSet(viewsets.ReadOnlyModelViewSet):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, )
    serializer_class = FacilityUsernameSerializer
    filter_fields = ('facility', )
    search_fields = ('^username', )

    def get_queryset(self):
        return FacilityUser.objects.filter(dataset__learner_can_login_with_no_password=True, roles=None).filter(
            Q(devicepermissions__is_superuser=False) | Q(devicepermissions__isnull=True))


class MembershipFilter(FilterSet):
    user_ids = CharFilter(method="filter_user_ids")

    def filter_user_ids(self, queryset, name, value):
        return queryset.filter(user_id__in=value.split(','))

    class Meta:
        model = Membership
        fields = ["user", "collection", "user_ids", ]


class MembershipViewSet(BulkDeleteMixin, BulkCreateMixin, viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    filter_class = MembershipFilter
    filter_fields = ['user', 'collection', 'user_ids', ]


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
        if type(logged_in_user) is AnonymousUser:
            return Response(Facility.objects.all().values_list('id', flat=True))
        else:
            return Response([logged_in_user.facility_id])


class PublicFacilityViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Facility.objects.all()
    serializer_class = PublicFacilitySerializer


class ClassroomViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer


class LearnerGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer

    filter_fields = ('parent',)


class SignUpViewSet(viewsets.ViewSet):

    serializer_class = FacilityUserSignupSerializer

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
        serialized_user = self.serializer_class(data=data)
        if serialized_user.is_valid():
            serialized_user.save()
            serialized_user.instance.set_password(data['password'])
            serialized_user.instance.save()
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
        elif not password and FacilityUser.objects.filter(username=username, facility=facility_id).exists():
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
                   'user_id': user.id,
                   'can_manage_content': user.can_manage_content}
        roles = Role.objects.filter(user_id=user.id)

        if len(roles) is 0:
            session.update({'facility_id': user.facility_id,
                            'kind': ['learner'],
                            'error': '200'})
        else:
            session.update({'facility_id': user.facility_id,
                            'kind': [],
                            'error': '200'})
            for role in roles:
                if role.kind == 'admin':
                    session['kind'].append('admin')
                elif role.kind == 'coach':
                    session['kind'].append('coach')

        if user.is_superuser:
            session['kind'].insert(0, 'superuser')

        if active:
            UserSessionLog.update_log(user)

        return session
