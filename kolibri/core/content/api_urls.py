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
from .api import FileViewset
from .api import RemoteChannelViewSet
from .api import UserContentNodeViewset

router = routers.SimpleRouter()
router.register("channel", ChannelMetadataViewSet, base_name="channel")

router.register(r"contentnode", ContentNodeViewset, base_name="contentnode")
router.register(r"usercontentnode", UserContentNodeViewset, base_name="usercontentnode")
router.register(
    r"contentnode_tree", ContentNodeTreeViewset, base_name="contentnode_tree"
)
router.register(
    r"contentnode_search", ContentNodeSearchViewset, base_name="contentnode_search"
)
router.register(
    r"contentnode_bookmarks",
    ContentNodeBookmarksViewset,
    base_name="contentnode_bookmarks",
)
router.register(r"file", FileViewset, base_name="file")
router.register(
    r"contentnodeprogress", ContentNodeProgressViewset, base_name="contentnodeprogress"
)
router.register(
    r"contentnode_granular",
    ContentNodeGranularViewset,
    base_name="contentnode_granular",
)
router.register(r"remotechannel", RemoteChannelViewSet, base_name="remotechannel")

urlpatterns = [url(r"^", include(router.urls))]
