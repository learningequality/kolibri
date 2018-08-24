from rest_framework import routers

from .api import NetworkLocationViewSet

router = routers.SimpleRouter()

router.register(r'networklocation', NetworkLocationViewSet, base_name='networklocation')

urlpatterns = router.urls
