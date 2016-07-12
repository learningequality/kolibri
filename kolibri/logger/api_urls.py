from rest_framework_nested import routers

from .api import ContentInteractionLogViewSet, ContentRatingLogViewSet, ContentSummaryLogViewSet, UserSessionLogViewSet

router = routers.SimpleRouter()

router.register(r'contentinteractionlog', ContentInteractionLogViewSet)
router.register(r'contentsummarylog', ContentSummaryLogViewSet)
router.register(r'contentratinglog', ContentRatingLogViewSet)
router.register(r'usersessionlog', UserSessionLogViewSet)

urlpatterns = router.urls
