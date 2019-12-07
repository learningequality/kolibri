from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ChannelMetadataViewSet
from .api import ContentNodeGranularViewset
from .api import ContentNodeProgressViewset
from .api import ContentNodeSearchViewset
from .api import ContentNodeSlimViewset
from .api import ContentNodeViewset
from .api import FileViewset
from .api import RemoteChannelViewSet

router = routers.SimpleRouter()
router.register("channel", ChannelMetadataViewSet, base_name="channel")

router.register(r"contentnode", ContentNodeViewset, base_name="contentnode")
router.register(
    r"contentnode_slim", ContentNodeSlimViewset, base_name="contentnode_slim"
)
router.register(
    r"contentnode_search", ContentNodeSearchViewset, base_name="contentnode_search"
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
