from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^', views.CoachToolsView.as_view()),
]
