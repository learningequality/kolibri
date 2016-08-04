from django.conf.urls import url
from rest_framework import routers

from .views import DeviceOwnerCreateView, DeviceOwnerCreateViewSet

router = routers.SimpleRouter()
router.register(r'create_deviceowner_api', DeviceOwnerCreateViewSet, base_name='deviceowner')

urlpatterns = router.urls

urlpatterns += [
    url(r'create_deviceowner_view', DeviceOwnerCreateView.as_view()),
]
