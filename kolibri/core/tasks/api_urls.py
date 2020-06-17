from rest_framework import routers

from .api import FacilityTasksViewSet
from .api import TasksViewSet

router = routers.SimpleRouter()
router.register("tasks", TasksViewSet, base_name="task")
router.register("facilitytasks", FacilityTasksViewSet, base_name="facilitytask")

urlpatterns = router.urls
