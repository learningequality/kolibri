from django.conf.urls import include
from django.conf.urls import url

from .views import logout
from .views import UserView

urlpatterns = [
    url(r'^oidc/', include('mozilla_django_oidc.urls')),
    url(r'^$', UserView.as_view(), name='user'),
    url(r'^logout/$', logout),
]
