from django.conf.urls import url

from .views import LearnView

urlpatterns = [
    url('^$', LearnView.as_view(), name='learn'),
]
