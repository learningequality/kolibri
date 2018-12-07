from django.conf.urls import include
from django.conf.urls import url

from .api_urls import urlpatterns
from .views import LearnView

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^$', LearnView.as_view(), name='learn'),
]
