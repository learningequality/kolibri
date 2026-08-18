from django.urls import include
from django.urls import path
from django.urls import re_path
from rest_framework import routers

from .api import ChannelThumbnailView
from .api import RemoteChannelViewSet
from .api import ShareFileView
from .viewsets.channel_metadata import ChannelMetadataViewSet
from .viewsets.content_request import ContentRequestViewset
from .viewsets.contentnode.base import ContentNodeViewset
from .viewsets.contentnode.bookmarks import ContentNodeBookmarksViewset
from .viewsets.contentnode.granular import ContentNodeGranularViewset
from .viewsets.contentnode.progress import ContentNodeProgressViewset
from .viewsets.contentnode.tree import ContentNodeTreeViewset
from .viewsets.contentnode.user import UserContentNodeViewset

router = routers.SimpleRouter()
router.register("channel", ChannelMetadataViewSet, basename="channel")

router.register(r"contentnode", ContentNodeViewset, basename="contentnode")
router.register(r"usercontentnode", UserContentNodeViewset, basename="usercontentnode")
router.register(
    r"contentnode_tree", ContentNodeTreeViewset, basename="contentnode_tree"
)
router.register(
    r"contentnode_bookmarks",
    ContentNodeBookmarksViewset,
    basename="contentnode_bookmarks",
)
router.register(
    r"contentnodeprogress", ContentNodeProgressViewset, basename="contentnodeprogress"
)
router.register(
    r"contentrequest",
    ContentRequestViewset,
    basename="contentrequest",
)
router.register(
    r"contentnode_granular",
    ContentNodeGranularViewset,
    basename="contentnode_granular",
)
router.register(r"remotechannel", RemoteChannelViewSet, basename="remotechannel")

urlpatterns = [
    path(
        "channel-thumbnail/<channel_id>/",
        ChannelThumbnailView.as_view(),
        name="channel-thumbnail",
    ),
    path("sharefile/", ShareFileView.as_view(), name="sharefile"),
    re_path(r"^", include(router.urls)),
]
