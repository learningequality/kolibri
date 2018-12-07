from rest_framework import viewsets

from .models import NetworkLocation
from .serializers import NetworkLocationSerializer
from kolibri.core.content.permissions import CanManageContent


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()
