from django.conf.urls import include
from django.conf.urls import url

from .views import logout
from .views import UserView

urlpatterns = [
    url(r'', include('mozilla_django_oidc.urls', namespace='oidc')),
    url(r'^$', UserView.as_view(), name='user'),
    url(r'^logout/$', logout),
]
