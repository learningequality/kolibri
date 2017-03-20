from django.conf.urls import include, url

from . import views
from .api_urls import urlpatterns

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^', views.CoachToolsView.as_view()),
]
