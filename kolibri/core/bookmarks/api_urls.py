from rest_framework import routers

from .viewsets.bookmark import BookmarksViewSet

router = routers.SimpleRouter()
router.register(r"bookmarks", BookmarksViewSet, basename="bookmarks")

urlpatterns = router.urls
