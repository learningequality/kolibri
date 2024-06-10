import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ErrorReports
from .serializers import ErrorReportSerializer

logger = logging.getLogger(__name__)


@api_view(["POST"])
def frontendreport(request):
    """
    test with:
    curl -X POST http://localhost:8000/api/errorreports/frontendreport/      -H "Content-Type: application/json"      -d '{
           "error_from": "frontend",
           "error_message": "An example error occurred",
           "traceback": "Traceback (most recent call last): ..."
         }'
    """
    serializer = ErrorReportSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        if not settings.DEVELOPER_MODE:
            logger.error("Saving error report in the database.")
            error = ErrorReports.insert_or_update_error(
                error_from=data["error_from"],
                error_message=data["error_message"],
                traceback=data["traceback"],
            )
            logger.error(
                "Error report saved successfully. Error ID: {}".format(error.id)
            )
            return Response(
                {"message": "Error report saved successfully.", "error_id": error.id},
                status=status.HTTP_201_CREATED,
            )
        logger.error(
            "Developer mode is enabled. Error report is not saved in the database."
        )
        return Response(
            {
                "message": "Error report not saved in the database. As we are in developer mode"
            },
            status=status.HTTP_200_OK,
        )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
