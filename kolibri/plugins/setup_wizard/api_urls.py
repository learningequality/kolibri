from rest_framework import routers

from .api import FacilityImportViewSet
from .api import SetupWizardResource
from .api import SetupWizardRestartZeroconf

router = routers.SimpleRouter()

router.register(r"facilityimport", FacilityImportViewSet, basename="facilityimport")
router.register(r"setupwizard", SetupWizardResource, basename="setupwizard")
router.register(
    r"restartzeroconf", SetupWizardRestartZeroconf, basename="restartzeroconf"
)

urlpatterns = router.urls
