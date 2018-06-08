from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^', views.StyleGuideView.as_view(), name='style_guide'),
]
