from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import ClassroomNotificationsViewset
from .api import ExerciseDifficultQuestionsViewset
from .api import LessonReportViewset
from .api import PracticeQuizDifficultQuestionsViewset
from .api import QuizDifficultQuestionsViewset
from .class_summary_api import ClassSummaryViewSet
from .unit_lesson_progress_api import UnitLessonProgressViewSet
from .unit_report_api import UnitReportViewSet

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

urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(
        r"^coursesession/(?P<course_session_id>[0-9a-fA-F]{32})/unit/(?P<unit_contentnode_id>[0-9a-fA-F]{32})/report/$",
        UnitReportViewSet.as_view({"get": "retrieve"}),
        name="unitreport",
    ),
    re_path(
        r"^coursesession/(?P<course_session_id>[0-9a-fA-F]{32})/unit/(?P<unit_contentnode_id>[0-9a-fA-F]{32})/lessonprogress/$",
        UnitLessonProgressViewSet.as_view({"get": "retrieve"}),
        name="unit_lesson_progress",
    ),
]
