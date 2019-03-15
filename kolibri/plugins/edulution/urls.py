from django.conf.urls import include
from django.conf.urls import url

from .api_urls import urlpatterns
from .views import EdulutionView

urlpatterns = [
    url('^api/', include(urlpatterns)),
    url('^$', EdulutionView.as_view(), name='edulution'),
]
