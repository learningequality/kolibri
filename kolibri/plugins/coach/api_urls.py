from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ClassroomNotificationsViewset
from .api import ExerciseDifficultQuestionsViewset
from .api import LessonReportViewset
from .api import QuizDifficultQuestionsViewset
from .class_summary_api import ClassSummaryViewSet

router = routers.DefaultRouter()

router.register(r"lessonreport", LessonReportViewset, base_name="lessonreport")
router.register(r"classsummary", ClassSummaryViewSet, base_name="classsummary")
router.register(
    r"notifications", ClassroomNotificationsViewset, base_name="notifications"
)
router.register(
    r"exercisedifficulties",
    ExerciseDifficultQuestionsViewset,
    base_name="exercisedifficulties",
)
router.register(
    r"quizdifficulties", QuizDifficultQuestionsViewset, base_name="quizdifficulties"
)

urlpatterns = [url(r"^", include(router.urls))]
