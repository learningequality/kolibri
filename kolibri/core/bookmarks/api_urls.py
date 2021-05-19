from rest_framework import routers

from .api import BookmarksViewSet

router = routers.SimpleRouter()
router.register(r"bookmarks", BookmarksViewSet, basename="bookmarks")

urlpatterns = router.urls
