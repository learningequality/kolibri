from rest_framework import routers

from .viewsets.tasks import TasksViewSet

router = routers.SimpleRouter()
router.register("tasks", TasksViewSet, basename="task")

urlpatterns = router.urls
