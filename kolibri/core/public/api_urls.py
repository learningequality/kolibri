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
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf.urls import include
from django.conf.urls import url
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
from .api import SyncQueueViewSet


router = routers.SimpleRouter()

router.register(r"v1/facility", PublicFacilityViewSet, basename="publicfacility")
router.register(r"facilityuser", PublicFacilityUserViewSet, basename="publicuser")
router.register(
    r"facilitysearchuser", FacilitySearchUsernameViewSet, basename="publicsearchuser"
)
router.register(r"signup", PublicSignUpViewSet, basename="publicsignup")
router.register(r"info", InfoViewSet, basename="info")
router.register(r"syncqueue", SyncQueueViewSet, basename="syncqueue")

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

# Add public api endpoints
urlpatterns = [
    url(r"^", include(router.urls)),
    url(r"v2/", include(public_content_v2_router.urls)),
    url(
        r"(?P<version>[^/]+)/channels/lookup/(?P<identifier>[^/]+)",
        get_public_channel_lookup,
        name="get_public_channel_lookup",
    ),
    url(
        r"(?P<version>[^/]+)/channels",
        get_public_channel_list,
        name="get_public_channel_list",
    ),
    url(
        r"(?P<version>[^/]+)/file_checksums/",
        get_public_file_checksums,
        name="get_public_file_checksums",
    ),
]
