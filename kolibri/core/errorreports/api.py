import logging

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .constants import FRONTEND
from .models import ErrorReports
from .serializers import ErrorReportSerializer


logger = logging.getLogger(__name__)


@api_view(["POST"])
def report(request):
    serializer = ErrorReportSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        try:
            error = ErrorReports.insert_or_update_error(
                FRONTEND,
                data["error_message"],
                data["traceback"],
                context=data["context"],
            )
            return Response(
                {"error_id": error.id if error else None}, status=status.HTTP_200_OK
            )

        except (AttributeError, ValidationError) as e:
            logger.error("Error while saving error report: {}".format(e))
            return Response(
                {"error": "Error while saving error report: {}".format(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
