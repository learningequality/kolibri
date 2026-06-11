from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info


class DriveInfoViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    def list(self, request):
        drives = get_mounted_drives_with_channel_info()
        return Response([mountdata._asdict() for mountdata in drives])

    def retrieve(self, request, pk):
        return Response(get_mounted_drive_by_id(pk)._asdict())
