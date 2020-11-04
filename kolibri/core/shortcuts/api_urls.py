from rest_framework import routers

from .api import ShortcutViewSet
from .api import ShortcutContentNodeViewSet

router = routers.SimpleRouter()

router.register(r"shortcut", ShortcutViewSet, base_name="shortcut")
router.register(
    r"shortcut_contentnode",
    ShortcutContentNodeViewSet,
    base_name="shortcut_contentnode",
)

urlpatterns = router.urls
