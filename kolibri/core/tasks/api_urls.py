from rest_framework import routers

from .api import TasksViewSet

router = routers.SimpleRouter()
router.register("tasks", TasksViewSet, base_name="task")

urlpatterns = router.urls
