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
           "context": {
                "browser":"",
                    "component":"my component",
                    "device":{
                        "type": "desktop",
                        "platform":"Windows",
                        "screen": {
                            "width":545,
                            "height":858
                    }
            }
         }'
    """
    serializer = ErrorReportSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        try:
            error = ErrorReports.insert_or_update_error(
                FRONTEND,
                data["error_message"],
                data["traceback"],
                context_frontend=data["context"],
            )
            return Response(
                {"error_id": error.id if error else None}, status=status.HTTP_200_OK
            )

        except (AttributeError, Exception) as e:
            logger.error("Error while saving error report: {}".format(e))
            return Response(
                {"error": "Error while saving error report"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
