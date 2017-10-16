from rest_framework import routers

from .api import LocalDeviceViewSet

router = routers.SimpleRouter()
router.register('localdevice', LocalDeviceViewSet, base_name='localdevice')

urlpatterns = router.urls
