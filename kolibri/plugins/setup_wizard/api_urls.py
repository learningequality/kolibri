from rest_framework import routers

from .viewsets.setup_wizard import FacilityImportViewSet
from .viewsets.setup_wizard import SetupWizardResource

router = routers.SimpleRouter()

router.register(r"facilityimport", FacilityImportViewSet, basename="facilityimport")
router.register(r"setupwizard", SetupWizardResource, basename="setupwizard")

urlpatterns = router.urls
