from api_urls import urlpatterns
from django.conf.urls import include, url

from . import views

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^', views.CoachToolsView.as_view()),
]
