from django.conf.urls import include
from django.conf.urls import url

from . import views
from .api_urls import urlpatterns

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^$', views.CoachView.as_view(), name='coach'),
]
