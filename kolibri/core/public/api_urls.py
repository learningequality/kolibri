"""
Kolibri public url patterns
===========================

This module defines the "public API" endpoints that we expect to be called externally by other
instances of Kolibri, or by 3rd party applications or clients. For this reason, these endpoints
need to be maintained with backwards compatibility to ensure ongoing support for older clients.

If breaking changes need to be introduced to an endpoint, a new endpoint should be created
instead, at a different URL (e.g. with version number v2 instead of v1), leaving the original
endpoint in place and maintained to the best extent possible so older clients can still use it.

"""
from django.urls import include
from django.urls import re_path
from rest_framework import routers

from ..auth.api import PublicFacilityUserViewSet
from ..auth.api import PublicFacilityViewSet
from ..auth.api import PublicSignUpViewSet
from .api import FacilitySearchUsernameViewSet
from .api import get_public_channel_list
from .api import get_public_channel_lookup
from .api import get_public_file_checksums
from .api import InfoViewSet
from .api import PublicChannelMetadataViewSet
from .api import PublicContentNodeTreeViewSet
from .api import PublicContentNodeViewSet
from .api import SyncQueueAPIView
from kolibri.core.content.public_api import ImportMetadataViewset


router = routers.SimpleRouter()

router.register(r"v1/facility", PublicFacilityViewSet, basename="publicfacility")
router.register(r"facilityuser", PublicFacilityUserViewSet, basename="publicuser")
router.register(
    r"facilitysearchuser", FacilitySearchUsernameViewSet, basename="publicsearchuser"
)
router.register(r"signup", PublicSignUpViewSet, basename="publicsignup")
router.register(r"info", InfoViewSet, basename="info")

public_content_v2_router = routers.SimpleRouter()
public_content_v2_router.register(
    r"channel", PublicChannelMetadataViewSet, basename="publicchannel"
)
public_content_v2_router.register(
    r"contentnode", PublicContentNodeViewSet, basename="publiccontentnode"
)
public_content_v2_router.register(
    r"contentnode_tree",
    PublicContentNodeTreeViewSet,
    basename="publiccontentnode_tree",
)
public_content_v2_router.register(
    r"importmetadata", ImportMetadataViewset, basename="importmetadata"
)

# Add public api endpoints
urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(r"v2/", include(public_content_v2_router.urls)),
    re_path(
        r"(?P<version>[^/]+)/channels/lookup/(?P<identifier>[^/]+)$",
        get_public_channel_lookup,
        name="get_public_channel_lookup",
    ),
    re_path(
        r"(?P<version>[^/]+)/channels",
        get_public_channel_list,
        name="get_public_channel_list",
    ),
    re_path(
        r"(?P<version>[^/]+)/file_checksums/",
        get_public_file_checksums,
        name="get_public_file_checksums",
    ),
    re_path(
        r"syncqueue/",
        SyncQueueAPIView.as_view(),
        name="syncqueue",
    ),
]
