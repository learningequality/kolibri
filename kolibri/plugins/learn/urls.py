from django.conf.urls import url

from . import views

urlpatterns = [
    url('^', views.LearnView.as_view(), name='learn'),
]
