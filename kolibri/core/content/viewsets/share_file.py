import logging

from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import CharField
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.views import APIView

from kolibri.core import error_constants
from kolibri.core.content import models
from kolibri.core.content.hooks import ShareFileHook
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.device.permissions import FromAppContextPermission

logger = logging.getLogger(__name__)


class ShareFileSerializer(Serializer):
    content_node = PrimaryKeyRelatedField(
        queryset=models.ContentNode.objects.filter(available=True).exclude(
            kind__in=[content_kinds.TOPIC, content_kinds.EXERCISE]
        )
    )
    message = CharField(max_length=1000)


class ShareFileView(APIView):
    permission_classes = (IsAuthenticated, FromAppContextPermission)

    def post(self, request):
        serializer = ShareFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content_node = serializer.validated_data["content_node"]
        message = serializer.validated_data["message"]
        # Rely on default priority ordering
        default_file = content_node.files.first()
        if not default_file:
            return Response(
                {"error": "No files found for content node"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        filepath = get_content_storage_file_path(default_file.local_file.get_filename())
        try:
            ShareFileHook.execute_file_share(filepath, message)
        except Exception:
            # The hook is plugin-provided and its message could disclose local
            # paths, so it stays out of the response (#14717).
            logger.exception("file share hook failed")
            return Response(
                {"error": {"id": error_constants.SHARE_FILE_FAILED}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_201_CREATED)
