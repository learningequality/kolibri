from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.CoachView.as_view(), name='coach'),
]
