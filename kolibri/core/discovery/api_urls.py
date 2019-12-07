from rest_framework import routers

from .api import NetworkLocationViewSet
from .api import NetworkSearchViewSet

router = routers.SimpleRouter()

router.register(r"networklocation", NetworkLocationViewSet, base_name="networklocation")
router.register(r"networksearch", NetworkSearchViewSet, base_name="networksearch")

urlpatterns = router.urls
