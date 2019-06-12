from django.conf.urls import include
from django.conf.urls import url

urlpatterns = [
    url(r'', include('mozilla_django_oidc.urls'), name='openidconnect'),
]
