from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import ClassroomNotificationsViewset
from .api import ExerciseDifficultQuestionsViewset
from .api import LessonReportViewset
from .api import PracticeQuizDifficultQuestionsViewset
from .api import QuizDifficultQuestionsViewset
from .class_summary_api import ClassSummaryViewSet

router = routers.DefaultRouter()

router.register(r"lessonreport", LessonReportViewset, basename="lessonreport")
router.register(r"classsummary", ClassSummaryViewSet, basename="classsummary")
router.register(
    r"notifications", ClassroomNotificationsViewset, basename="notifications"
)
router.register(
    r"exercisedifficulties",
    ExerciseDifficultQuestionsViewset,
    basename="exercisedifficulties",
)
router.register(
    r"quizdifficulties", QuizDifficultQuestionsViewset, basename="quizdifficulties"
)
router.register(
    r"practicequizdifficulties",
    PracticeQuizDifficultQuestionsViewset,
    basename="practicequizdifficulties",
)

urlpatterns = [re_path(r"^", include(router.urls))]
