from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ChannelMetadataViewSet
from .api import ContentNodeBookmarksViewset
from .api import ContentNodeGranularViewset
from .api import ContentNodeProgressViewset
from .api import ContentNodeSearchViewset
from .api import ContentNodeTreeViewset
from .api import ContentNodeViewset
from .api import ContentRequestViewset
from .api import FileViewset
from .api import RemoteChannelViewSet
from .api import UserContentNodeViewset

router = routers.SimpleRouter()
router.register("channel", ChannelMetadataViewSet, basename="channel")

router.register(r"contentnode", ContentNodeViewset, basename="contentnode")
router.register(r"usercontentnode", UserContentNodeViewset, basename="usercontentnode")
router.register(
    r"contentnode_tree", ContentNodeTreeViewset, basename="contentnode_tree"
)
router.register(
    r"contentnode_search", ContentNodeSearchViewset, basename="contentnode_search"
)
router.register(
    r"contentnode_bookmarks",
    ContentNodeBookmarksViewset,
    basename="contentnode_bookmarks",
)
router.register(r"file", FileViewset, basename="file")
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

urlpatterns = [url(r"^", include(router.urls))]
