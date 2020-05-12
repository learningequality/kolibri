from kolibri.core.auth.models import FacilityUser
from rest_framework.viewsets import GenericViewSet
from django.db.models import Q
from rest_framework.response import Response


class FacilityAdminView(GenericViewSet):
    queryset = FacilityUser.objects.filter(
        Q(roles__kind__contains="admin") | Q(devicepermissions__is_superuser=True)
    )

    def list(self, request):
        queryset = self.get_queryset()
        data = [{"username": user.username, "id": user.id} for user in queryset]
        return Response(data)
