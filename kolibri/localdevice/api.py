from rest_framework import viewsets, mixins
from kolibri.content.utils.channels import get_mounted_drives_with_channel_info
from rest_framework.response import Response
from kolibri.utils.system import get_free_space
from rest_framework.decorators import list_route
from kolibri.content.permissions import CanManageContent

class LocalDeviceViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = (CanManageContent,)

    def get_queryset(self):
        pass

    def list(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)
        out = [mountdata._asdict() for mountdata in drives.values()]

        return Response(out)

    @list_route(methods=['get'])
    def freespace(self, request):
        path = request.query_params.get('path')
        if path is None:
            free = get_free_space()
        else:
            free = get_free_space(path)

        return Response({"freespace": free})
