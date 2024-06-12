import logging

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .constants import FRONTEND
from .models import ErrorReports
from .serializers import ErrorReportSerializer

logger = logging.getLogger(__name__)


@api_view(["POST"])
def report(request):
    """
    test with:
    curl -X POST http://localhost:8000/api/errorreports/report/      -H "Content-Type: application/json"      -d '{
           "error_message": "An example error occurred",
           "traceback": "Traceback (most recent call last): ..."
         }'
    """
    serializer = ErrorReportSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        error = ErrorReports.insert_or_update_error(
            error_from=FRONTEND,
            error_message=data["error_message"],
            traceback=data["traceback"],
        )

        return Response(
            {"error_id": error.id if error else None}, status=status.HTTP_200_OK
        )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
