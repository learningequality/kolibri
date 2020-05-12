from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import FacilityAdminView
from .api import GrantSuperuserPermissionsView
from .api import StartFacilityImportTaskView

router = routers.DefaultRouter()

router.register(r"facilityadmins", FacilityAdminView, base_name="facilityadmins")
router.register(
    r"grantsuperuserpermissions",
    GrantSuperuserPermissionsView,
    base_name="grantsuperuserpermissions",
)
router.register(
    r"startfacilityimporttask",
    StartFacilityImportTaskView,
    base_name="startfacilityimporttask",
)

urlpatterns = [url(r"^", include(router.urls))]
