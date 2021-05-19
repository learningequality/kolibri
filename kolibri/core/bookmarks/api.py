from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_403_FORBIDDEN
from rest_framework.status import HTTP_405_METHOD_NOT_ALLOWED

from .models import Bookmark
from .serializers import BookmarksSerializer
from kolibri.core.api import ValuesViewset


class BookmarksViewSet(ValuesViewset):
    values = ("channel_id", "contentnode_id", "id", "content_id")
    serializer_class = BookmarksSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        return Bookmark.objects.filter(facility_user=request.user)

    def list(self, request):
        bookmarks = Bookmark.objects.filter(facility_user=request.user).values(
            "channel_id", "content_id", "contentnode_id", "id"
        )
        serializer = BookmarksSerializer(bookmarks, many=True)

        return Response(serializer.data, status=HTTP_200_OK)

    def create(self, request):
        """
        Overridden for two reasons:
        1) Inject user into the data before creating it to avoid NOT NULL on facility_user
        2) Provide meaningful HTTP responses accordingly, including 200 for duplicates
        """
        # POST requires these three to come from the client
        required_keys = ["channel_id", "contentnode_id", "content_id"]
        # Gather keys that are missing from request.data (which is unacceptable)
        missing_keys = [k for k in required_keys if k not in request.data]
        # Tell the client what went wrong
        if len(missing_keys):
            return Response(
                "Missing required: {}".format(", ".join(missing_keys)),
                status=HTTP_400_BAD_REQUEST,
            )

        # Everything is now validated, let's make the bookmark and return a response
        request.data.update({"facility_user": request.user})
        obj, created = Bookmark.objects.get_or_create(**request.data)

        serializer = BookmarksSerializer(obj)
        return_status_code = HTTP_201_CREATED if created else HTTP_200_OK

        return Response(serializer.data, status=return_status_code)

    def destroy(self, request, pk):
        try:
            bookmark = Bookmark.objects.get(pk=pk)
        except Bookmark.DoesNotExist:
            return Response(
                "Cannot delete Bookmark with id {} because it does not exist.",
                status=HTTP_204_NO_CONTENT,
            )
        if bookmark.facility_user != request.user:
            return Response(None, status=HTTP_403_FORBIDDEN)
        else:
            return Response({"success": True}, status=HTTP_204_NO_CONTENT)

    def update(self, *args, **kwargs):
        return Response(None, status=HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, *args, **kwargs):
        return Response(None, status=HTTP_405_METHOD_NOT_ALLOWED)

    def retrieve(self, *args, **kwargs):
        return Response(None, status=HTTP_405_METHOD_NOT_ALLOWED)
