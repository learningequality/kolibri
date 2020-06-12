from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import FacilityAdminView
from .api import GrantSuperuserPermissionsView
from .api import SetupWizardFacilityImportTaskView
from .api import CreateSuperuserAfterFacilityImportView
from .api import ProvisionDeviceAfterFacilityImportView

router = routers.DefaultRouter()

router.register(r"facilityadmins", FacilityAdminView, base_name="facilityadmins")
router.register(
    r"grantsuperuserpermissions",
    GrantSuperuserPermissionsView,
    base_name="grantsuperuserpermissions",
)
router.register(
    r"tasks", SetupWizardFacilityImportTaskView, base_name="tasks",
)
router.register(
    r"createsuperuser",
    CreateSuperuserAfterFacilityImportView,
    base_name="createsuperuser",
)
router.register(
    r"provisionafterimport",
    ProvisionDeviceAfterFacilityImportView,
    base_name="provisionafterimport",
)

urlpatterns = [url(r"^", include(router.urls))]
