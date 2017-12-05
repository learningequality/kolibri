from django.conf.urls import include, url
from rest_framework import routers

from .api import DeviceInfoView, DevicePermissionsViewSet, DeviceProvisionView, FreeSpaceView

router = routers.SimpleRouter()
router.register(r'devicepermissions', DevicePermissionsViewSet, base_name='devicepermissions')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^deviceprovision/', DeviceProvisionView.as_view({'post': 'create'}), name='deviceprovision'),
    url(r'^freespace/', FreeSpaceView.as_view({'get': 'list'}), name='freespace'),
    url(r'^deviceinfo/', DeviceInfoView.as_view(), name='deviceinfo'),
]
