from django.conf.urls import url
from kolibri.plugins.learn import views

urlpatterns = [
    url('^', views.LearnView.as_view(), name='learn'),
]
