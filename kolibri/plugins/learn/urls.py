from django.conf.urls import include
from django.conf.urls import url
from .views import LearnView
from .api_urls import urlpatterns

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^$', LearnView.as_view(), name='learn'),
]
