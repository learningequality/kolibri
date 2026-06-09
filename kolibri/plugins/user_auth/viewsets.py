from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as RestValidationError

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.utils.pagination import ValuesViewsetCursorPagination


class FacilityUsernamePagination(ValuesViewsetCursorPagination):
    page_size = 10
    max_page_size = 20
    page_size_query_param = "max_results"
    ordering = ("username",)


class FacilityUsernameSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityUser
        fields = ("username",)


class FacilityUsernameViewSet(ReadOnlyValuesViewset):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ("facility",)
    search_fields = ("^username",)
    pagination_class = FacilityUsernamePagination
    serializer_class = FacilityUsernameSerializer

    def get_queryset(self):
        if valid_app_key_on_request(self.request):
            # Special case for app context to return usernames for
            # the list display
            return FacilityUser.objects.all()
        return FacilityUser.objects.filter(
            Q(dataset__learner_can_login_with_no_password=True)
            | Q(dataset__picture_password_settings__isnull=False),
            roles=None,
        ).filter(
            Q(devicepermissions__is_superuser=False) | Q(devicepermissions__isnull=True)
        )

    def list(self, request, *args, **kwargs):
        search = request.query_params.get(filters.SearchFilter.search_param)
        if search is not None and len(search) < 3:
            raise RestValidationError("search term must be at least 3 characters long")
        return super().list(request, *args, **kwargs)
