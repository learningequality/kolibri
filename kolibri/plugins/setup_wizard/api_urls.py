from rest_framework import routers

from .api import FacilityImportViewSet
from .api import SetupWizardResource

router = routers.SimpleRouter()

router.register(r"facilityimport", FacilityImportViewSet, basename="facilityimport")
router.register(r"setupwizard", SetupWizardResource, basename="setupwizard")

urlpatterns = router.urls
